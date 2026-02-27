package db

import (
	"masala_inventory_managment"
	"os"
	"path/filepath"
	"testing"
)

func TestMigrator_RunMigrations_Integration(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "migration_int_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "migration_test.db")
	manager := NewDatabaseManager(dbPath)
	if err := manager.Connect(); err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer manager.Close()

	migrator := NewMigrator(manager)
	// Use the REAL migrations that we embedded in migration_assets.go
	if err := migrator.RunMigrations(masala_inventory_managment.MigrationAssets, "internal/infrastructure/db/migrations"); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Verify tables exist
	tables := []string{
		"roles",
		"users",
		"items",
		"stock_ledger",
		"batches",
		"grns",
		"grn_lines",
		"packaging_profiles",
		"packaging_profile_components",
		"unit_conversions",
		"recipes",
		"recipe_components",
		"raw_item_details",
		"bulk_powder_item_details",
		"packing_material_item_details",
		"finished_good_item_details",
	}
	for _, table := range tables {
		var name string
		err := manager.GetDB().QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&name)
		if err != nil {
			t.Errorf("Table %s not found: %v", table, err)
		}
	}

	// Verify default admin role was inserted
	var roleName string
	err = manager.GetDB().QueryRow("SELECT name FROM roles WHERE name='admin'").Scan(&roleName)
	if err != nil {
		t.Errorf("Default admin role not found: %v", err)
	}
}
