package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"masala_inventory_managment"
	appInventory "masala_inventory_managment/internal/app/inventory"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
	"masala_inventory_managment/internal/infrastructure/db"
)

func main() {
	scenario := flag.String("scenario", "optimistic-lock", "scenario to run")
	flag.Parse()

	switch *scenario {
	case "optimistic-lock":
		if err := runOptimisticLockScenario(); err != nil {
			fmt.Fprintf(os.Stderr, "FAIL: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("PASS: optimistic-lock")
	default:
		fmt.Fprintf(os.Stderr, "unknown scenario: %s\n", *scenario)
		os.Exit(2)
	}
}

func runOptimisticLockScenario() error {
	tempDir, err := os.MkdirTemp("", "story-automation-probe")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "probe.db")
	manager := db.NewDatabaseManager(dbPath)
	if err := manager.Connect(); err != nil {
		return fmt.Errorf("connect db: %w", err)
	}
	defer manager.Close()

	migrator := db.NewMigrator(manager)
	if err := migrator.RunMigrations(masala_inventory_managment.MigrationAssets, "internal/infrastructure/db/migrations"); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}

	repo := db.NewSqliteInventoryRepository(manager.GetDB())
	svc := appInventory.NewService(repo)

	item := &domainInventory.Item{
		SKU:          "PROBE-SKU-1",
		Name:         "Probe Item",
		Category:     "Raw",
		Unit:         "kg",
		MinimumStock: 1,
		IsActive:     true,
	}
	if err := svc.CreateItem(item); err != nil {
		return fmt.Errorf("create item: %w", err)
	}

	if err := manager.GetDB().QueryRow("SELECT updated_at FROM items WHERE id = ?", item.ID).Scan(&item.UpdatedAt); err != nil {
		return fmt.Errorf("read item updated_at: %w", err)
	}

	stale := *item
	item.Name = "Probe Item Updated"
	if err := svc.UpdateItem(item); err != nil {
		return fmt.Errorf("first update should succeed: %w", err)
	}

	stale.Name = "Probe Item Stale Update"
	err = svc.UpdateItem(&stale)
	if err == nil {
		return errors.New("expected concurrency conflict message but got nil")
	}
	if err.Error() != appInventory.ErrRecordModified {
		return fmt.Errorf("expected %q, got %q", appInventory.ErrRecordModified, err.Error())
	}

	return nil
}
