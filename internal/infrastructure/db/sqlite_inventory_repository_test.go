package db

import (
	"errors"
	"os"
	"path/filepath"
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

	grn := &domainInventory.GRN{
		GRNNumber:    "GRN-100",
		SupplierName: "Supplier A",
		InvoiceNo:    "INV-100",
		Notes:        "Initial",
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
