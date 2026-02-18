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
