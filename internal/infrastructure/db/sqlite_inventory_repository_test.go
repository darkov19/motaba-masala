package db

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"masala_inventory_managment"
	domainErrors "masala_inventory_managment/internal/domain/errors"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
)

func setupInventoryRepo(t *testing.T) (*SqliteInventoryRepository, *DatabaseManager) {
	t.Helper()

	tempDir, err := os.MkdirTemp("", "inventory_repo_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(tempDir) })

	dbPath := filepath.Join(tempDir, "inventory_test.db")
	manager := NewDatabaseManager(dbPath)
	if err := manager.Connect(); err != nil {
		t.Fatalf("Failed to connect to db: %v", err)
	}
	t.Cleanup(func() { _ = manager.Close() })

	migrator := NewMigrator(manager)
	if err := migrator.RunMigrations(masala_inventory_managment.MigrationAssets, "internal/infrastructure/db/migrations"); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	return NewSqliteInventoryRepository(manager.GetDB()), manager
}

func assertItemDetailsRow(t *testing.T, db *DatabaseManager, table string, itemID int64) {
	t.Helper()

	var count int
	query := "SELECT COUNT(1) FROM " + table + " WHERE item_id = ?"
	if err := db.GetDB().QueryRow(query, itemID).Scan(&count); err != nil {
		t.Fatalf("failed to query %s: %v", table, err)
	}
	if count != 1 {
		t.Fatalf("expected 1 details row in %s for item %d, got %d", table, itemID, count)
	}
}

func TestSqliteInventoryRepository_UpdateItem_ConcurrencyConflict(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	item := &domainInventory.Item{
		SKU:          "SKU-1",
		Name:         "Item 1",
		Category:     "Raw",
		Unit:         "kg",
		MinimumStock: 1,
		IsActive:     true,
	}
	if err := repo.CreateItem(item); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}
	if err := manager.GetDB().QueryRow("SELECT updated_at FROM items WHERE id = ?", item.ID).Scan(&item.UpdatedAt); err != nil {
		t.Fatalf("Failed to read item updated_at: %v", err)
	}

	stale := *item

	item.Name = "Item 1 Updated"
	if err := repo.UpdateItem(item); err != nil {
		t.Fatalf("UpdateItem failed unexpectedly: %v", err)
	}

	stale.Name = "Stale update"
	err := repo.UpdateItem(&stale)
	if !errors.Is(err, domainErrors.ErrConcurrencyConflict) {
		t.Fatalf("Expected ErrConcurrencyConflict, got %v", err)
	}
}

func TestSqliteInventoryRepository_UpdateBatch_ConcurrencyConflict(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	item := &domainInventory.Item{
		SKU:          "SKU-2",
		Name:         "Item 2",
		Category:     "Raw",
		Unit:         "kg",
		MinimumStock: 2,
		IsActive:     true,
	}
	if err := repo.CreateItem(item); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}

	batch := &domainInventory.Batch{
		BatchNumber: "B-100",
		ItemID:      item.ID,
		Quantity:    10,
	}
	if err := repo.CreateBatch(batch); err != nil {
		t.Fatalf("CreateBatch failed: %v", err)
	}
	if err := manager.GetDB().QueryRow("SELECT updated_at FROM batches WHERE id = ?", batch.ID).Scan(&batch.UpdatedAt); err != nil {
		t.Fatalf("Failed to read batch updated_at: %v", err)
	}

	stale := *batch

	batch.Quantity = 12
	if err := repo.UpdateBatch(batch); err != nil {
		t.Fatalf("UpdateBatch failed unexpectedly: %v", err)
	}

	stale.Quantity = 15
	err := repo.UpdateBatch(&stale)
	if !errors.Is(err, domainErrors.ErrConcurrencyConflict) {
		t.Fatalf("Expected ErrConcurrencyConflict, got %v", err)
	}
}

func TestSqliteInventoryRepository_UpdateGRN_ConcurrencyConflict(t *testing.T) {
	repo, manager := setupInventoryRepo(t)
	rawID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-100", "Raw Turmeric", "kg")
	supplierID := createTestParty(t, repo, "Supplier A")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-100",
		SupplierID: supplierID,
		InvoiceNo:    "INV-100",
		Notes:        "Initial",
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 10},
		},
	}
	if err := repo.CreateGRN(grn); err != nil {
		t.Fatalf("CreateGRN failed: %v", err)
	}
	if err := manager.GetDB().QueryRow("SELECT updated_at FROM grns WHERE id = ?", grn.ID).Scan(&grn.UpdatedAt); err != nil {
		t.Fatalf("Failed to read grn updated_at: %v", err)
	}

	stale := *grn

	grn.Notes = "Updated notes"
	if err := repo.UpdateGRN(grn); err != nil {
		t.Fatalf("UpdateGRN failed unexpectedly: %v", err)
	}

	stale.Notes = "Stale notes"
	err := repo.UpdateGRN(&stale)
	if !errors.Is(err, domainErrors.ErrConcurrencyConflict) {
		t.Fatalf("Expected ErrConcurrencyConflict, got %v", err)
	}
}

func createTestInventoryItem(t *testing.T, repo *SqliteInventoryRepository, itemType domainInventory.ItemType, sku, name, baseUnit string) int64 {
	t.Helper()

	item := &domainInventory.Item{
		SKU:      sku,
		Name:     name,
		ItemType: itemType,
		BaseUnit: baseUnit,
		IsActive: true,
	}
	if err := repo.CreateItem(item); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}
	return item.ID
}

func createTestParty(t *testing.T, repo *SqliteInventoryRepository, name string) int64 {
	t.Helper()

	party := &domainInventory.Party{
		PartyType: "SUPPLIER",
		Name:      name,
		Phone:     "0000000000",
		IsActive:  true,
	}
	if err := repo.CreateParty(party); err != nil {
		t.Fatalf("CreateParty(%q) failed: %v", name, err)
	}
	return party.ID
}

func TestSqliteInventoryRepository_CreateGRN_PersistsLinesAndStockLedger(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	rawID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-10", "Raw Chili", "kg")
	packID := createTestInventoryItem(t, repo, domainInventory.ItemTypePackingMaterial, "PACK-20", "Pouch Film", "pcs")
	supplierID := createTestParty(t, repo, "Acme Supplier")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-3001",
		SupplierID: supplierID,
		InvoiceNo:    "INV-3001",
		Notes:        "Dock receipt",
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 40},
			{LineNo: 2, ItemID: packID, QuantityReceived: 15},
		},
	}
	if err := repo.CreateGRN(grn); err != nil {
		t.Fatalf("CreateGRN failed: %v", err)
	}

	var lineCount int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM grn_lines WHERE grn_id = ?", grn.ID).Scan(&lineCount); err != nil {
		t.Fatalf("failed to count grn lines: %v", err)
	}
	if lineCount != 2 {
		t.Fatalf("expected 2 grn lines, got %d", lineCount)
	}

	var ledgerCount int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM stock_ledger WHERE reference_id = ?", grn.GRNNumber).Scan(&ledgerCount); err != nil {
		t.Fatalf("failed to count stock ledger rows: %v", err)
	}
	if ledgerCount != 2 {
		t.Fatalf("expected 2 stock ledger rows, got %d", ledgerCount)
	}

	var lotCount int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM material_lots WHERE grn_id = ?", grn.ID).Scan(&lotCount); err != nil {
		t.Fatalf("failed to count material lots: %v", err)
	}
	if lotCount != 2 {
		t.Fatalf("expected 2 material lots, got %d", lotCount)
	}

	var ledgerLotCount int
	if err := manager.GetDB().QueryRow(
		"SELECT COUNT(1) FROM stock_ledger WHERE reference_id = ? AND lot_number IS NOT NULL AND lot_number != ''",
		grn.GRNNumber,
	).Scan(&ledgerLotCount); err != nil {
		t.Fatalf("failed to count stock ledger lots: %v", err)
	}
	if ledgerLotCount != 2 {
		t.Fatalf("expected 2 stock ledger lot references, got %d", ledgerLotCount)
	}
}

func TestSqliteInventoryRepository_CreateGRN_RollsBackOnInvalidLineItemType(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	rawID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-11", "Raw Coriander", "kg")
	finishedID := createTestInventoryItem(t, repo, domainInventory.ItemTypeFinishedGood, "FG-30", "Finished Pack", "pcs")
	supplierID := createTestParty(t, repo, "Acme Supplier")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-3002",
		SupplierID: supplierID,
		InvoiceNo:    "INV-3002",
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 10},
			{LineNo: 2, ItemID: finishedID, QuantityReceived: 2},
		},
	}
	if err := repo.CreateGRN(grn); err == nil {
		t.Fatalf("expected invalid item type error")
	}

	var headerCount int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM grns WHERE grn_number = ?", "GRN-3002").Scan(&headerCount); err != nil {
		t.Fatalf("failed to query grn header count: %v", err)
	}
	if headerCount != 0 {
		t.Fatalf("expected header rollback, found %d rows", headerCount)
	}

	var lineCount int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM grn_lines").Scan(&lineCount); err != nil {
		t.Fatalf("failed to query grn lines count: %v", err)
	}
	if lineCount != 0 {
		t.Fatalf("expected line rollback, found %d rows", lineCount)
	}

	var ledgerCount int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM stock_ledger WHERE reference_id = ?", "GRN-3002").Scan(&ledgerCount); err != nil {
		t.Fatalf("failed to query stock ledger count: %v", err)
	}
	if ledgerCount != 0 {
		t.Fatalf("expected ledger rollback, found %d rows", ledgerCount)
	}

	var lotCount int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM material_lots WHERE grn_number = ?", "GRN-3002").Scan(&lotCount); err != nil {
		t.Fatalf("failed to query material lot rollback count: %v", err)
	}
	if lotCount != 0 {
		t.Fatalf("expected material lot rollback, found %d rows", lotCount)
	}
}

func TestSqliteInventoryRepository_CreateGRN_GeneratesDeterministicUniqueLotNumbers(t *testing.T) {
	repo, manager := setupInventoryRepo(t)
	rawID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-21", "Raw Cumin", "kg")
	supplierID := createTestParty(t, repo, "Supplier A")

	first := &domainInventory.GRN{
		GRNNumber:  "GRN-3101",
		SupplierID: supplierID,
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 10},
		},
	}
	if err := repo.CreateGRN(first); err != nil {
		t.Fatalf("CreateGRN first failed: %v", err)
	}

	second := &domainInventory.GRN{
		GRNNumber:  "GRN-3102",
		SupplierID: supplierID,
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 12},
		},
	}
	if err := repo.CreateGRN(second); err != nil {
		t.Fatalf("CreateGRN second failed: %v", err)
	}

	if first.Lines[0].LotNumber == "" || second.Lines[0].LotNumber == "" {
		t.Fatalf("expected lot numbers on persisted lines, got first=%q second=%q", first.Lines[0].LotNumber, second.Lines[0].LotNumber)
	}
	if first.Lines[0].LotNumber == second.Lines[0].LotNumber {
		t.Fatalf("expected unique lot numbers, got %q", first.Lines[0].LotNumber)
	}
	if !strings.HasPrefix(first.Lines[0].LotNumber, "LOT-") || !strings.HasPrefix(second.Lines[0].LotNumber, "LOT-") {
		t.Fatalf("expected LOT-prefixed lot numbers, got %q and %q", first.Lines[0].LotNumber, second.Lines[0].LotNumber)
	}

	var distinctLots int
	if err := manager.GetDB().QueryRow("SELECT COUNT(DISTINCT lot_number) FROM material_lots WHERE grn_number IN ('GRN-3101','GRN-3102')").Scan(&distinctLots); err != nil {
		t.Fatalf("failed to count distinct lots: %v", err)
	}
	if distinctLots != 2 {
		t.Fatalf("expected 2 distinct lots, got %d", distinctLots)
	}
}

func TestSqliteInventoryRepository_ListMaterialLots_FiltersAndReturnsNewestFirst(t *testing.T) {
	repo, _ := setupInventoryRepo(t)
	rawID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-31", "Raw Cardamom", "kg")
	supplierID := createTestParty(t, repo, "Trace Supplier")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-3201",
		SupplierID: supplierID,
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 14},
		},
	}
	if err := repo.CreateGRN(grn); err != nil {
		t.Fatalf("CreateGRN failed: %v", err)
	}

	lots, err := repo.ListMaterialLots(domainInventory.MaterialLotListFilter{
		Search:     "trace supplier",
		ActiveOnly: true,
	})
	if err != nil {
		t.Fatalf("ListMaterialLots failed: %v", err)
	}
	if len(lots) == 0 {
		t.Fatalf("expected at least one lot")
	}
	if lots[0].LotNumber == "" || lots[0].GRNNumber != "GRN-3201" {
		t.Fatalf("unexpected lot payload: %+v", lots[0])
	}
}

func TestSqliteInventoryRepository_RecordAndListLotStockMovements_TracksNonInboundContinuity(t *testing.T) {
	repo, _ := setupInventoryRepo(t)
	rawID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-41", "Raw Fennel", "kg")
	supplierID := createTestParty(t, repo, "Trace Supplier")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-3301",
		SupplierID: supplierID,
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 30},
		},
	}
	if err := repo.CreateGRN(grn); err != nil {
		t.Fatalf("CreateGRN failed: %v", err)
	}
	lotNumber := grn.Lines[0].LotNumber
	if lotNumber == "" {
		t.Fatalf("expected lot number on GRN line")
	}

	movement := &domainInventory.StockLedgerMovement{
		LotNumber:       lotNumber,
		TransactionType: "OUT",
		Quantity:        5,
		ReferenceID:     "PK-3301",
		Notes:           "packing consumption",
	}
	if err := repo.RecordLotStockMovement(movement); err != nil {
		t.Fatalf("RecordLotStockMovement failed: %v", err)
	}

	movements, err := repo.ListLotStockMovements(domainInventory.StockLedgerMovementListFilter{
		LotNumber: lotNumber,
	})
	if err != nil {
		t.Fatalf("ListLotStockMovements failed: %v", err)
	}
	if len(movements) < 2 {
		t.Fatalf("expected at least inbound and downstream movement, got %d", len(movements))
	}

	if movements[0].TransactionType != "IN" {
		t.Fatalf("expected first movement to be inbound IN, got %s", movements[0].TransactionType)
	}

	foundDownstream := false
	for _, m := range movements {
		if m.TransactionType == "OUT" && m.ReferenceID == "PK-3301" {
			foundDownstream = true
			if m.LotNumber != lotNumber {
				t.Fatalf("expected downstream movement lot continuity, got %q", m.LotNumber)
			}
		}
	}
	if !foundDownstream {
		t.Fatalf("expected downstream OUT movement for lot %s", lotNumber)
	}
}

func TestSqliteInventoryRepository_CreateGRN_PersistsSupplierAndInvoice(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	rawID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-12", "Raw Pepper", "kg")
	partyID := createTestParty(t, repo, "Supplier Ref A")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-3003",
		SupplierID: partyID,
		InvoiceNo:  "INV-3003",
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 11},
		},
	}
	if err := repo.CreateGRN(grn); err != nil {
		t.Fatalf("CreateGRN failed: %v", err)
	}

	var persistedSupplierID int64
	var invoice string
	if err := manager.GetDB().QueryRow("SELECT supplier_id, invoice_no FROM grns WHERE id = ?", grn.ID).Scan(&persistedSupplierID, &invoice); err != nil {
		t.Fatalf("failed to query persisted grn header: %v", err)
	}
	if persistedSupplierID != partyID || invoice != "INV-3003" {
		t.Fatalf("unexpected persisted supplier_id/invoice: %d / %q", persistedSupplierID, invoice)
	}
}

func TestSqliteInventoryRepository_CreateItem_PersistsItemMasterFields(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	item := &domainInventory.Item{
		SKU:         "SKU-MASTER-1",
		Name:        "Jar Body",
		ItemType:    domainInventory.ItemTypePackingMaterial,
		BaseUnit:    "pcs",
		ItemSubtype: "JAR_BODY",
		IsActive:    true,
	}
	if err := repo.CreateItem(item); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}

	var itemType, baseUnit, itemSubtype, category, unit string
	err := manager.GetDB().QueryRow(
		"SELECT item_type, base_unit, item_subtype, category, unit FROM items WHERE id = ?",
		item.ID,
	).Scan(&itemType, &baseUnit, &itemSubtype, &category, &unit)
	if err != nil {
		t.Fatalf("Failed to read persisted item: %v", err)
	}

	if itemType != string(domainInventory.ItemTypePackingMaterial) {
		t.Fatalf("expected item_type %q, got %q", domainInventory.ItemTypePackingMaterial, itemType)
	}
	if baseUnit != "pcs" {
		t.Fatalf("expected base_unit pcs, got %q", baseUnit)
	}
	if itemSubtype != "JAR_BODY" {
		t.Fatalf("expected item_subtype JAR_BODY, got %q", itemSubtype)
	}
	if category != string(domainInventory.ItemTypePackingMaterial) {
		t.Fatalf("expected category alias %q, got %q", domainInventory.ItemTypePackingMaterial, category)
	}
	if unit != "pcs" {
		t.Fatalf("expected unit alias pcs, got %q", unit)
	}
	assertItemDetailsRow(t, manager, "packing_material_item_details", item.ID)
}

func TestSqliteInventoryRepository_CreateItem_CreatesTypeSpecificDetailsRows(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	items := []struct {
		item  *domainInventory.Item
		table string
	}{
		{
			item: &domainInventory.Item{
				SKU:      "SKU-RAW-DETAIL",
				Name:     "Raw Coriander",
				ItemType: domainInventory.ItemTypeRaw,
				BaseUnit: "kg",
				IsActive: true,
			},
			table: "raw_item_details",
		},
		{
			item: &domainInventory.Item{
				SKU:      "SKU-BULK-DETAIL",
				Name:     "Bulk Garam",
				ItemType: domainInventory.ItemTypeBulkPowder,
				BaseUnit: "kg",
				IsActive: true,
			},
			table: "bulk_powder_item_details",
		},
		{
			item: &domainInventory.Item{
				SKU:      "SKU-FG-DETAIL",
				Name:     "FG Garam 100g",
				ItemType: domainInventory.ItemTypeFinishedGood,
				BaseUnit: "pcs",
				IsActive: true,
			},
			table: "finished_good_item_details",
		},
	}

	for _, tc := range items {
		if err := repo.CreateItem(tc.item); err != nil {
			t.Fatalf("CreateItem failed: %v", err)
		}
		assertItemDetailsRow(t, manager, tc.table, tc.item.ID)
	}
}

func TestSqliteInventoryRepository_UpdateItem_EnsuresTargetTypeDetailsRow(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	item := &domainInventory.Item{
		SKU:      "SKU-SWITCH-TYPE",
		Name:     "Switch Type",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	if err := repo.CreateItem(item); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}
	if err := manager.GetDB().QueryRow("SELECT updated_at FROM items WHERE id = ?", item.ID).Scan(&item.UpdatedAt); err != nil {
		t.Fatalf("failed to load updated_at: %v", err)
	}

	item.ItemType = domainInventory.ItemTypeFinishedGood
	item.BaseUnit = "pcs"
	if err := repo.UpdateItem(item); err != nil {
		t.Fatalf("UpdateItem failed: %v", err)
	}

	assertItemDetailsRow(t, manager, "raw_item_details", item.ID)
	assertItemDetailsRow(t, manager, "finished_good_item_details", item.ID)
}

func TestSqliteInventoryRepository_ListItems_FilterByTypeAndActive(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	activeRaw := &domainInventory.Item{
		SKU:      "SKU-LIST-1",
		Name:     "Raw Chili",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	inactivePacking := &domainInventory.Item{
		SKU:      "SKU-LIST-2",
		Name:     "Jar Lid",
		ItemType: domainInventory.ItemTypePackingMaterial,
		BaseUnit: "pcs",
		IsActive: false,
	}
	if err := repo.CreateItem(activeRaw); err != nil {
		t.Fatalf("CreateItem activeRaw failed: %v", err)
	}
	if err := repo.CreateItem(inactivePacking); err != nil {
		t.Fatalf("CreateItem inactivePacking failed: %v", err)
	}

	items, err := repo.ListItems(domainInventory.ItemListFilter{
		ActiveOnly: true,
		ItemType:   domainInventory.ItemTypeRaw,
	})
	if err != nil {
		t.Fatalf("ListItems failed: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 active raw item, got %d", len(items))
	}
	if items[0].SKU != "SKU-LIST-1" {
		t.Fatalf("expected SKU-LIST-1, got %s", items[0].SKU)
	}
}

func TestSqliteInventoryRepository_CreatePackagingProfile_RejectsNonPackingMaterial(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	rawItem := &domainInventory.Item{
		SKU:      "SKU-RAW-COMP",
		Name:     "Raw Salt",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	if err := repo.CreateItem(rawItem); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}

	profile := &domainInventory.PackagingProfile{
		Name:     "Invalid Raw Component",
		PackMode: "JAR_200G",
		IsActive: true,
		Components: []domainInventory.PackagingProfileComponent{
			{
				PackingMaterialItemID: rawItem.ID,
				QtyPerUnit:            1,
			},
		},
	}
	if err := repo.CreatePackagingProfile(profile); err == nil {
		t.Fatalf("expected error for non PACKING_MATERIAL component")
	}
}

func TestSqliteInventoryRepository_CreatePackagingProfile_RejectsMissingComponentItem(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	profile := &domainInventory.PackagingProfile{
		Name:     "Invalid Missing Component",
		PackMode: "JAR_200G",
		IsActive: true,
		Components: []domainInventory.PackagingProfileComponent{
			{
				PackingMaterialItemID: 999999,
				QtyPerUnit:            1,
			},
		},
	}
	if err := repo.CreatePackagingProfile(profile); err == nil {
		t.Fatalf("expected error for missing PACKING_MATERIAL component id")
	}

	var count int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM packaging_profiles").Scan(&count); err != nil {
		t.Fatalf("failed to query packaging_profiles count: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected transactional rollback with zero profiles, got %d", count)
	}
}

func TestSqliteInventoryRepository_CreateAndListPackagingProfiles(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	jarBody := &domainInventory.Item{
		SKU:         "SKU-PACK-1",
		Name:        "Jar Body",
		ItemType:    domainInventory.ItemTypePackingMaterial,
		BaseUnit:    "pcs",
		ItemSubtype: "JAR_BODY",
		IsActive:    true,
	}
	jarLid := &domainInventory.Item{
		SKU:         "SKU-PACK-2",
		Name:        "Jar Lid",
		ItemType:    domainInventory.ItemTypePackingMaterial,
		BaseUnit:    "pcs",
		ItemSubtype: "JAR_LID",
		IsActive:    true,
	}
	if err := repo.CreateItem(jarBody); err != nil {
		t.Fatalf("CreateItem jarBody failed: %v", err)
	}
	if err := repo.CreateItem(jarLid); err != nil {
		t.Fatalf("CreateItem jarLid failed: %v", err)
	}

	profile := &domainInventory.PackagingProfile{
		Name:     "Jar Pack 200g",
		PackMode: "JAR_200G",
		IsActive: true,
		Components: []domainInventory.PackagingProfileComponent{
			{PackingMaterialItemID: jarBody.ID, QtyPerUnit: 1},
			{PackingMaterialItemID: jarLid.ID, QtyPerUnit: 1},
		},
	}
	if err := repo.CreatePackagingProfile(profile); err != nil {
		t.Fatalf("CreatePackagingProfile failed: %v", err)
	}

	profiles, err := repo.ListPackagingProfiles(domainInventory.PackagingProfileListFilter{
		ActiveOnly: true,
		Search:     "Jar Pack",
	})
	if err != nil {
		t.Fatalf("ListPackagingProfiles failed: %v", err)
	}
	if len(profiles) != 1 {
		t.Fatalf("expected 1 profile, got %d", len(profiles))
	}
	if len(profiles[0].Components) != 2 {
		t.Fatalf("expected 2 components, got %d", len(profiles[0].Components))
	}
}

func TestSqliteInventoryRepository_CreatePackagingProfile_RespectsInactiveFlag(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	jarBody := &domainInventory.Item{
		SKU:         "SKU-PACK-INACTIVE-1",
		Name:        "Jar Body",
		ItemType:    domainInventory.ItemTypePackingMaterial,
		BaseUnit:    "pcs",
		ItemSubtype: "JAR_BODY",
		IsActive:    true,
	}
	if err := repo.CreateItem(jarBody); err != nil {
		t.Fatalf("CreateItem jarBody failed: %v", err)
	}

	profile := &domainInventory.PackagingProfile{
		Name:     "Inactive Jar Pack",
		PackMode: "JAR_200G",
		IsActive: false,
		Components: []domainInventory.PackagingProfileComponent{
			{PackingMaterialItemID: jarBody.ID, QtyPerUnit: 1},
		},
	}
	if err := repo.CreatePackagingProfile(profile); err != nil {
		t.Fatalf("CreatePackagingProfile failed: %v", err)
	}

	var active bool
	if err := manager.GetDB().QueryRow("SELECT is_active FROM packaging_profiles WHERE id = ?", profile.ID).Scan(&active); err != nil {
		t.Fatalf("failed to query profile active flag: %v", err)
	}
	if active {
		t.Fatalf("expected profile to persist as inactive, got active")
	}
}

func TestSqliteInventoryRepository_UnitConversionRules_CreateAndFindWithFallback(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	item := &domainInventory.Item{
		SKU:      "SKU-CONV-1",
		Name:     "Conversion Item",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "KG",
		IsActive: true,
	}
	if err := repo.CreateItem(item); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}

	globalRule := &domainInventory.UnitConversionRule{
		FromUnit:       "GRAM",
		ToUnit:         "KG",
		Factor:         0.001,
		PrecisionScale: 4,
		RoundingMode:   domainInventory.RoundingModeHalfUp,
		IsActive:       true,
	}
	if err := repo.CreateUnitConversionRule(globalRule); err != nil {
		t.Fatalf("CreateUnitConversionRule global failed: %v", err)
	}

	found, err := repo.FindUnitConversionRule(domainInventory.UnitConversionLookup{
		ItemID:   &item.ID,
		FromUnit: "GRAM",
		ToUnit:   "KG",
	})
	if err != nil {
		t.Fatalf("FindUnitConversionRule fallback failed: %v", err)
	}
	if found.ItemID != nil {
		t.Fatalf("expected global rule fallback, got item-specific rule")
	}

	itemSpecific := &domainInventory.UnitConversionRule{
		ItemID:         &item.ID,
		FromUnit:       "GRAM",
		ToUnit:         "KG",
		Factor:         0.002,
		PrecisionScale: 4,
		RoundingMode:   domainInventory.RoundingModeHalfUp,
		IsActive:       true,
	}
	if err := repo.CreateUnitConversionRule(itemSpecific); err != nil {
		t.Fatalf("CreateUnitConversionRule item-specific failed: %v", err)
	}

	found, err = repo.FindUnitConversionRule(domainInventory.UnitConversionLookup{
		ItemID:   &item.ID,
		FromUnit: "GRAM",
		ToUnit:   "KG",
	})
	if err != nil {
		t.Fatalf("FindUnitConversionRule item-specific failed: %v", err)
	}
	if found.ItemID == nil || *found.ItemID != item.ID {
		t.Fatalf("expected item-specific conversion rule")
	}
	if found.Factor != 0.002 {
		t.Fatalf("expected item-specific factor 0.002, got %f", found.Factor)
	}
}

func TestSqliteInventoryRepository_UnitConversionRules_ListAndMissingRule(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	rule := &domainInventory.UnitConversionRule{
		FromUnit:       "GRAM",
		ToUnit:         "KG",
		Factor:         0.001,
		PrecisionScale: 3,
		RoundingMode:   domainInventory.RoundingModeDown,
		IsActive:       true,
	}
	if err := repo.CreateUnitConversionRule(rule); err != nil {
		t.Fatalf("CreateUnitConversionRule failed: %v", err)
	}

	rules, err := repo.ListUnitConversionRules(domainInventory.UnitConversionRuleFilter{
		FromUnit:   "GRAM",
		ToUnit:     "KG",
		ActiveOnly: true,
	})
	if err != nil {
		t.Fatalf("ListUnitConversionRules failed: %v", err)
	}
	if len(rules) != 1 {
		t.Fatalf("expected 1 conversion rule, got %d", len(rules))
	}
	if rules[0].RoundingMode != domainInventory.RoundingModeDown {
		t.Fatalf("expected rounding mode DOWN, got %s", rules[0].RoundingMode)
	}

	_, err = repo.FindUnitConversionRule(domainInventory.UnitConversionLookup{
		FromUnit: "LITER",
		ToUnit:   "KG",
	})
	if !errors.Is(err, domainInventory.ErrConversionRuleNotFound) {
		t.Fatalf("expected ErrConversionRuleNotFound, got %v", err)
	}
}

func TestSqliteInventoryRepository_CreateAndListRecipes(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	outputItem := &domainInventory.Item{
		SKU:      "SKU-RCP-OUT-1",
		Name:     "Bulk Garam Masala",
		ItemType: domainInventory.ItemTypeBulkPowder,
		BaseUnit: "kg",
		IsActive: true,
	}
	rawChili := &domainInventory.Item{
		SKU:      "SKU-RCP-RAW-1",
		Name:     "Raw Chili",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	rawCoriander := &domainInventory.Item{
		SKU:      "SKU-RCP-RAW-2",
		Name:     "Raw Coriander",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	for _, item := range []*domainInventory.Item{outputItem, rawChili, rawCoriander} {
		if err := repo.CreateItem(item); err != nil {
			t.Fatalf("CreateItem failed: %v", err)
		}
	}

	recipe := &domainInventory.Recipe{
		RecipeCode:         "RCP-GM-001",
		OutputItemID:       outputItem.ID,
		OutputQtyBase:      100,
		ExpectedWastagePct: 2.5,
		IsActive:           true,
		Components: []domainInventory.RecipeComponent{
			{InputItemID: rawChili.ID, InputQtyBase: 60, LineNo: 1},
			{InputItemID: rawCoriander.ID, InputQtyBase: 42.5, LineNo: 2},
		},
	}
	if err := repo.CreateRecipe(recipe); err != nil {
		t.Fatalf("CreateRecipe failed: %v", err)
	}

	recipes, err := repo.ListRecipes(domainInventory.RecipeListFilter{
		ActiveOnly: true,
		Search:     "RCP-GM",
	})
	if err != nil {
		t.Fatalf("ListRecipes failed: %v", err)
	}
	if len(recipes) != 1 {
		t.Fatalf("expected 1 recipe, got %d", len(recipes))
	}
	if len(recipes[0].Components) != 2 {
		t.Fatalf("expected 2 recipe components, got %d", len(recipes[0].Components))
	}
	if recipes[0].ExpectedWastagePct != 2.5 {
		t.Fatalf("expected wastage 2.5, got %f", recipes[0].ExpectedWastagePct)
	}
}

func TestSqliteInventoryRepository_CreateRecipe_RejectsInvalidOutputItemType(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	rawOutput := &domainInventory.Item{
		SKU:      "SKU-RCP-OUT-RAW",
		Name:     "Raw Coriander",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	rawInput := &domainInventory.Item{
		SKU:      "SKU-RCP-RAW-ONLY",
		Name:     "Raw Chili",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	for _, item := range []*domainInventory.Item{rawOutput, rawInput} {
		if err := repo.CreateItem(item); err != nil {
			t.Fatalf("CreateItem failed: %v", err)
		}
	}

	recipe := &domainInventory.Recipe{
		RecipeCode:    "RCP-BAD-OUT",
		OutputItemID:  rawOutput.ID,
		OutputQtyBase: 100,
		IsActive:      true,
		Components: []domainInventory.RecipeComponent{
			{InputItemID: rawInput.ID, InputQtyBase: 100, LineNo: 1},
		},
	}
	if err := repo.CreateRecipe(recipe); err == nil {
		t.Fatalf("expected output item type validation failure")
	}

	var count int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM recipes").Scan(&count); err != nil {
		t.Fatalf("failed to query recipes count: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected rollback with zero recipes, got %d", count)
	}
}

func TestSqliteInventoryRepository_CreateRecipe_RejectsMissingComponentAndRollsBack(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	outputItem := &domainInventory.Item{
		SKU:      "SKU-RCP-OUT-ROLLBACK",
		Name:     "Bulk Turmeric Mix",
		ItemType: domainInventory.ItemTypeBulkPowder,
		BaseUnit: "kg",
		IsActive: true,
	}
	if err := repo.CreateItem(outputItem); err != nil {
		t.Fatalf("CreateItem failed: %v", err)
	}

	recipe := &domainInventory.Recipe{
		RecipeCode:    "RCP-ROLLBACK",
		OutputItemID:  outputItem.ID,
		OutputQtyBase: 50,
		IsActive:      true,
		Components: []domainInventory.RecipeComponent{
			{InputItemID: 999999, InputQtyBase: 50, LineNo: 1},
		},
	}
	if err := repo.CreateRecipe(recipe); err == nil {
		t.Fatalf("expected missing component failure")
	}

	var count int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM recipes").Scan(&count); err != nil {
		t.Fatalf("failed to query recipes count: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected rollback with zero recipes, got %d", count)
	}
}

func TestSqliteInventoryRepository_UpdateRecipe_InvalidComponentRollsBack(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	outputItem := &domainInventory.Item{
		SKU:      "SKU-RCP-OUT-UPD-RB",
		Name:     "Bulk Pepper Mix",
		ItemType: domainInventory.ItemTypeBulkPowder,
		BaseUnit: "kg",
		IsActive: true,
	}
	rawInput := &domainInventory.Item{
		SKU:      "SKU-RCP-RAW-UPD-RB",
		Name:     "Raw Pepper",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	for _, item := range []*domainInventory.Item{outputItem, rawInput} {
		if err := repo.CreateItem(item); err != nil {
			t.Fatalf("CreateItem failed: %v", err)
		}
	}

	recipe := &domainInventory.Recipe{
		RecipeCode:         "RCP-UPD-RB-1",
		OutputItemID:       outputItem.ID,
		OutputQtyBase:      100,
		ExpectedWastagePct: 1.5,
		IsActive:           true,
		Components: []domainInventory.RecipeComponent{
			{InputItemID: rawInput.ID, InputQtyBase: 100, LineNo: 1},
		},
	}
	if err := repo.CreateRecipe(recipe); err != nil {
		t.Fatalf("CreateRecipe failed: %v", err)
	}
	if err := manager.GetDB().QueryRow("SELECT updated_at FROM recipes WHERE id = ?", recipe.ID).Scan(&recipe.UpdatedAt); err != nil {
		t.Fatalf("failed to query recipe updated_at: %v", err)
	}

	updateAttempt := *recipe
	updateAttempt.OutputQtyBase = 120
	updateAttempt.ExpectedWastagePct = 3.5
	updateAttempt.Components = []domainInventory.RecipeComponent{
		{InputItemID: 999999, InputQtyBase: 120, LineNo: 1},
	}
	if err := repo.UpdateRecipe(&updateAttempt); err == nil {
		t.Fatalf("expected update to fail for invalid component item")
	}

	recipes, err := repo.ListRecipes(domainInventory.RecipeListFilter{Search: "RCP-UPD-RB-1"})
	if err != nil {
		t.Fatalf("ListRecipes failed: %v", err)
	}
	if len(recipes) != 1 {
		t.Fatalf("expected one recipe after failed update, got %d", len(recipes))
	}
	if recipes[0].OutputQtyBase != 100 {
		t.Fatalf("expected output quantity to remain 100, got %f", recipes[0].OutputQtyBase)
	}
	if recipes[0].ExpectedWastagePct != 1.5 {
		t.Fatalf("expected wastage to remain 1.5, got %f", recipes[0].ExpectedWastagePct)
	}
	if len(recipes[0].Components) != 1 {
		t.Fatalf("expected original component set to remain intact, got %d components", len(recipes[0].Components))
	}
	if recipes[0].Components[0].InputItemID != rawInput.ID {
		t.Fatalf("expected original component item %d, got %d", rawInput.ID, recipes[0].Components[0].InputItemID)
	}
}

func TestSqliteInventoryRepository_UpdateRecipe_ConcurrencyConflict(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	outputItem := &domainInventory.Item{
		SKU:      "SKU-RCP-OUT-CC",
		Name:     "Bulk Sambar Mix",
		ItemType: domainInventory.ItemTypeBulkPowder,
		BaseUnit: "kg",
		IsActive: true,
	}
	rawInput := &domainInventory.Item{
		SKU:      "SKU-RCP-RAW-CC",
		Name:     "Raw Chili",
		ItemType: domainInventory.ItemTypeRaw,
		BaseUnit: "kg",
		IsActive: true,
	}
	for _, item := range []*domainInventory.Item{outputItem, rawInput} {
		if err := repo.CreateItem(item); err != nil {
			t.Fatalf("CreateItem failed: %v", err)
		}
	}

	recipe := &domainInventory.Recipe{
		RecipeCode:    "RCP-CC-1",
		OutputItemID:  outputItem.ID,
		OutputQtyBase: 100,
		IsActive:      true,
		Components: []domainInventory.RecipeComponent{
			{InputItemID: rawInput.ID, InputQtyBase: 100, LineNo: 1},
		},
	}
	if err := repo.CreateRecipe(recipe); err != nil {
		t.Fatalf("CreateRecipe failed: %v", err)
	}
	if err := manager.GetDB().QueryRow("SELECT updated_at FROM recipes WHERE id = ?", recipe.ID).Scan(&recipe.UpdatedAt); err != nil {
		t.Fatalf("failed to query recipe updated_at: %v", err)
	}

	stale := *recipe

	recipe.ExpectedWastagePct = 3
	if err := repo.UpdateRecipe(recipe); err != nil {
		t.Fatalf("UpdateRecipe failed: %v", err)
	}

	stale.ExpectedWastagePct = 4
	if err := repo.UpdateRecipe(&stale); !errors.Is(err, domainErrors.ErrConcurrencyConflict) {
		t.Fatalf("expected concurrency conflict, got %v", err)
	}
}

func TestSqliteInventoryRepository_CreateAndListParties(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	supplierLead := 7
	supplier := &domainInventory.Party{
		PartyType:    domainInventory.PartyTypeSupplier,
		Name:         "Acme Supplier",
		Phone:        "9998887777",
		Email:        "acme@supplier.test",
		Address:      "Market Road",
		LeadTimeDays: &supplierLead,
		IsActive:     true,
	}
	customer := &domainInventory.Party{
		PartyType: domainInventory.PartyTypeCustomer,
		Name:      "Metro Distributor",
		Phone:     "8887776666",
		Address:   "Retail Street",
		IsActive:  true,
	}

	if err := repo.CreateParty(supplier); err != nil {
		t.Fatalf("CreateParty supplier failed: %v", err)
	}
	if err := repo.CreateParty(customer); err != nil {
		t.Fatalf("CreateParty customer failed: %v", err)
	}

	partyRows, err := repo.ListParties(domainInventory.PartyListFilter{
		ActiveOnly: true,
		PartyType:  domainInventory.PartyTypeSupplier,
		Search:     "acme",
	})
	if err != nil {
		t.Fatalf("ListParties failed: %v", err)
	}
	if len(partyRows) != 1 {
		t.Fatalf("expected 1 supplier row, got %d", len(partyRows))
	}
	if partyRows[0].PartyType != domainInventory.PartyTypeSupplier {
		t.Fatalf("expected supplier type, got %s", partyRows[0].PartyType)
	}
	if partyRows[0].LeadTimeDays == nil || *partyRows[0].LeadTimeDays != 7 {
		t.Fatalf("expected lead time 7, got %+v", partyRows[0].LeadTimeDays)
	}
}

func TestSqliteInventoryRepository_CreateParty_DuplicateNameByTypeRejected(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	first := &domainInventory.Party{
		PartyType: domainInventory.PartyTypeSupplier,
		Name:      "Acme Supplier",
		Phone:     "9998887777",
		IsActive:  true,
	}
	second := &domainInventory.Party{
		PartyType: domainInventory.PartyTypeSupplier,
		Name:      " acme supplier ",
		Phone:     "1112223333",
		IsActive:  true,
	}

	if err := repo.CreateParty(first); err != nil {
		t.Fatalf("CreateParty first failed: %v", err)
	}
	if err := repo.CreateParty(second); err == nil {
		t.Fatalf("expected duplicate-party error")
	}

	var count int
	if err := manager.GetDB().QueryRow("SELECT COUNT(1) FROM parties").Scan(&count); err != nil {
		t.Fatalf("failed to query parties count: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one persisted row after duplicate rejection, got %d", count)
	}
}

func TestSqliteInventoryRepository_UpdateParty_ConcurrencyConflict(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	party := &domainInventory.Party{
		PartyType: domainInventory.PartyTypeSupplier,
		Name:      "Acme Supplier",
		Phone:     "9998887777",
		IsActive:  true,
	}
	if err := repo.CreateParty(party); err != nil {
		t.Fatalf("CreateParty failed: %v", err)
	}
	if err := manager.GetDB().QueryRow("SELECT updated_at FROM parties WHERE id = ?", party.ID).Scan(&party.UpdatedAt); err != nil {
		t.Fatalf("failed to query party updated_at: %v", err)
	}

	stale := *party
	party.Phone = "0001112222"
	if err := repo.UpdateParty(party); err != nil {
		t.Fatalf("UpdateParty failed: %v", err)
	}

	stale.Phone = "5556667777"
	if err := repo.UpdateParty(&stale); !errors.Is(err, domainErrors.ErrConcurrencyConflict) {
		t.Fatalf("expected concurrency conflict, got %v", err)
	}
}

// --- Story 3.3: Third-Party Bulk Procurement ---

func TestSqliteInventoryRepository_CreateGRN_BulkPowder_CreatesLotWithSourceTypeAndUnitCost(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	bulkID := createTestInventoryItem(t, repo, domainInventory.ItemTypeBulkPowder, "BULK-EXT-01", "Bulk Chili External", "kg")
	bulkSupplierID := createTestParty(t, repo, "External Bulk Supplier")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-BP-INT-001",
		SupplierID: bulkSupplierID,
		InvoiceNo:  "EXT-INV-001",
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: bulkID, QuantityReceived: 500, UnitPrice: 75.50},
		},
	}
	if err := repo.CreateGRN(grn); err != nil {
		t.Fatalf("CreateGRN (BULK_POWDER) failed: %v", err)
	}

	if grn.Lines[0].LotNumber == "" {
		t.Fatal("expected lot number to be generated for BULK_POWDER line")
	}

	var sourceType string
	var unitCost float64
	var persistedSupplierID int64
	err := manager.GetDB().QueryRow(
		"SELECT source_type, unit_cost, supplier_id FROM material_lots WHERE lot_number = ?",
		grn.Lines[0].LotNumber,
	).Scan(&sourceType, &unitCost, &persistedSupplierID)
	if err != nil {
		t.Fatalf("failed to query material_lot: %v", err)
	}
	if sourceType != "SUPPLIER_GRN" {
		t.Fatalf("expected source_type SUPPLIER_GRN, got %q", sourceType)
	}
	if unitCost != 75.50 {
		t.Fatalf("expected unit_cost 75.50, got %v", unitCost)
	}
	if persistedSupplierID != bulkSupplierID {
		t.Fatalf("expected supplier_id %d, got %d", bulkSupplierID, persistedSupplierID)
	}
}

func TestSqliteInventoryRepository_CreateGRN_BulkPowder_AppearsInListMaterialLots(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	bulkID := createTestInventoryItem(t, repo, domainInventory.ItemTypeBulkPowder, "BULK-EXT-02", "Bulk Cumin External", "kg")
	supplierID := createTestParty(t, repo, "Third Party Cumin Co")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-BP-INT-002",
		SupplierID: supplierID,
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: bulkID, QuantityReceived: 200, UnitPrice: 45.00},
		},
	}
	if err := repo.CreateGRN(grn); err != nil {
		t.Fatalf("CreateGRN (BULK_POWDER) failed: %v", err)
	}

	lots, err := repo.ListMaterialLots(domainInventory.MaterialLotListFilter{
		ItemID: &bulkID,
	})
	if err != nil {
		t.Fatalf("ListMaterialLots failed: %v", err)
	}
	if len(lots) != 1 {
		t.Fatalf("expected 1 lot for BULK_POWDER item, got %d", len(lots))
	}
	lot := lots[0]
	if lot.SourceType != "SUPPLIER_GRN" {
		t.Fatalf("expected source_type SUPPLIER_GRN on listed lot, got %q", lot.SourceType)
	}
	if lot.UnitCost != 45.00 {
		t.Fatalf("expected unit_cost 45.00 on listed lot, got %v", lot.UnitCost)
	}
	if lot.SupplierName != "Third Party Cumin Co" {
		t.Fatalf("expected supplier_name 'Third Party Cumin Co', got %q", lot.SupplierName)
	}
}

func TestSqliteInventoryRepository_CreateGRN_BulkPowder_FinishedGoodRejected(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	finishedID := createTestInventoryItem(t, repo, domainInventory.ItemTypeFinishedGood, "FG-BP-01", "Finished Chili Jar", "pcs")
	supplierID := createTestParty(t, repo, "Some Supplier")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-BP-INT-003",
		SupplierID: supplierID,
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: finishedID, QuantityReceived: 10, UnitPrice: 5.00},
		},
	}
	if err := repo.CreateGRN(grn); err == nil {
		t.Fatal("expected FINISHED_GOOD item to be rejected in GRN")
	}
}

func TestSqliteInventoryRepository_CreateStockAdjustment_HappyPath(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	itemID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-SA-01", "Raw Cumin", "kg")

	adj := &domainInventory.StockAdjustment{
		ItemID:     itemID,
		QtyDelta:   -10,
		ReasonCode: "Spoilage",
		Notes:      "found mold",
		CreatedBy:  "test-user",
	}
	if err := repo.CreateStockAdjustment(adj); err != nil {
		t.Fatalf("CreateStockAdjustment failed: %v", err)
	}
	if adj.ID == 0 {
		t.Fatal("expected adj.ID to be set after insert")
	}

	var qtyDelta float64
	var reasonCode, createdBy string
	if err := manager.GetDB().QueryRow(
		"SELECT qty_delta, reason_code, created_by FROM stock_adjustments WHERE id = ?",
		adj.ID,
	).Scan(&qtyDelta, &reasonCode, &createdBy); err != nil {
		t.Fatalf("failed to query stock_adjustments: %v", err)
	}
	if qtyDelta != -10 {
		t.Fatalf("expected qty_delta -10, got %v", qtyDelta)
	}
	if reasonCode != "Spoilage" {
		t.Fatalf("expected reason_code 'Spoilage', got %q", reasonCode)
	}
	if createdBy != "test-user" {
		t.Fatalf("expected created_by 'test-user', got %q", createdBy)
	}
}

func TestSqliteInventoryRepository_CreateStockAdjustment_LotIDNullable(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	itemID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-SA-02", "Raw Pepper", "kg")

	adj := &domainInventory.StockAdjustment{
		ItemID:     itemID,
		LotID:      nil,
		QtyDelta:   5,
		ReasonCode: "Counting Error",
		CreatedBy:  "test-user",
	}
	if err := repo.CreateStockAdjustment(adj); err != nil {
		t.Fatalf("CreateStockAdjustment (nil LotID) failed: %v", err)
	}

	var lotID any
	if err := manager.GetDB().QueryRow(
		"SELECT lot_id FROM stock_adjustments WHERE id = ?",
		adj.ID,
	).Scan(&lotID); err != nil {
		t.Fatalf("failed to query lot_id: %v", err)
	}
	if lotID != nil {
		t.Fatalf("expected lot_id to be NULL, got %v", lotID)
	}
}

func TestSqliteInventoryRepository_GetItemStockBalance_SumsLotsAndAdjustments(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	itemID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-BAL-01", "Balance Test Item", "kg")
	supplierID := createTestParty(t, repo, "Balance Test Supplier")

	// Create two GRN lots: 100 + 80 = 180 total received
	grn1 := &domainInventory.GRN{
		GRNNumber:  "GRN-BAL-001",
		SupplierID: supplierID,
		Lines:      []domainInventory.GRNLine{{LineNo: 1, ItemID: itemID, QuantityReceived: 100}},
	}
	if err := repo.CreateGRN(grn1); err != nil {
		t.Fatalf("CreateGRN 1 failed: %v", err)
	}
	grn2 := &domainInventory.GRN{
		GRNNumber:  "GRN-BAL-002",
		SupplierID: supplierID,
		Lines:      []domainInventory.GRNLine{{LineNo: 1, ItemID: itemID, QuantityReceived: 80}},
	}
	if err := repo.CreateGRN(grn2); err != nil {
		t.Fatalf("CreateGRN 2 failed: %v", err)
	}

	// Two adjustments: -20, -30 = -50 total
	for _, delta := range []float64{-20, -30} {
		adj := &domainInventory.StockAdjustment{
			ItemID:     itemID,
			QtyDelta:   delta,
			ReasonCode: "Audit Correction",
			CreatedBy:  "test-user",
		}
		if err := repo.CreateStockAdjustment(adj); err != nil {
			t.Fatalf("CreateStockAdjustment (delta=%v) failed: %v", delta, err)
		}
	}

	balance, err := repo.GetItemStockBalance(itemID)
	if err != nil {
		t.Fatalf("GetItemStockBalance failed: %v", err)
	}
	// Expected: 180 (lots) + (-50) (adjustments) = 130
	if balance != 130 {
		t.Fatalf("expected balance 130, got %v", balance)
	}
}

func TestSqliteInventoryRepository_GetItemStockBalance_NoLotsNoAdjustments(t *testing.T) {
	repo, _ := setupInventoryRepo(t)

	itemID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-BAL-02", "Empty Balance Item", "kg")

	balance, err := repo.GetItemStockBalance(itemID)
	if err != nil {
		t.Fatalf("GetItemStockBalance failed: %v", err)
	}
	if balance != 0 {
		t.Fatalf("expected balance 0 for item with no lots or adjustments, got %v", balance)
	}
}

func TestSqliteInventoryRepository_CreateGRN_UnitPricePersistedOnGRNLine(t *testing.T) {
	repo, manager := setupInventoryRepo(t)

	rawID := createTestInventoryItem(t, repo, domainInventory.ItemTypeRaw, "RAW-PRICE-01", "Raw Ginger", "kg")
	supplierID := createTestParty(t, repo, "Ginger Supplier")

	grn := &domainInventory.GRN{
		GRNNumber:  "GRN-PRICE-001",
		SupplierID: supplierID,
		Lines: []domainInventory.GRNLine{
			{LineNo: 1, ItemID: rawID, QuantityReceived: 25, UnitPrice: 30.00},
		},
	}
	if err := repo.CreateGRN(grn); err != nil {
		t.Fatalf("CreateGRN failed: %v", err)
	}

	var unitPrice float64
	if err := manager.GetDB().QueryRow(
		"SELECT unit_price FROM grn_lines WHERE grn_id = ? AND line_no = 1",
		grn.ID,
	).Scan(&unitPrice); err != nil {
		t.Fatalf("failed to query grn_line unit_price: %v", err)
	}
	if unitPrice != 30.00 {
		t.Fatalf("expected unit_price 30.00 on grn_line, got %v", unitPrice)
	}
}
