package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"masala_inventory_managment"
	appInventory "masala_inventory_managment/internal/app/inventory"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
	"masala_inventory_managment/internal/infrastructure/db"
)

const probeAdminToken = "probe-admin-token"

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
	case "item-master-packaging":
		if err := runItemMasterPackagingScenario(); err != nil {
			fmt.Fprintf(os.Stderr, "FAIL: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("PASS: item-master-packaging")
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
	svc := appInventory.NewService(repo, nil)

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

func runItemMasterPackagingScenario() error {
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
	svc := appInventory.NewService(repo, func(token string) (domainAuth.Role, error) {
		if token != probeAdminToken {
			return "", fmt.Errorf("invalid probe token")
		}
		return domainAuth.RoleAdmin, nil
	})

	jarBody, err := svc.CreateItemMaster(appInventory.CreateItemInput{
		SKU:         "PROBE-PACK-1",
		Name:        "Jar Body",
		ItemType:    "PACKING_MATERIAL",
		BaseUnit:    "pcs",
		ItemSubtype: "JAR_BODY",
		IsActive:    true,
		AuthToken:   probeAdminToken,
	})
	if err != nil {
		return fmt.Errorf("create jar body: %w", err)
	}
	jarLid, err := svc.CreateItemMaster(appInventory.CreateItemInput{
		SKU:         "PROBE-PACK-2",
		Name:        "Jar Lid",
		ItemType:    "PACKING_MATERIAL",
		BaseUnit:    "pcs",
		ItemSubtype: "JAR_LID",
		IsActive:    true,
		AuthToken:   probeAdminToken,
	})
	if err != nil {
		return fmt.Errorf("create jar lid: %w", err)
	}

	_, err = svc.CreatePackagingProfile(appInventory.CreatePackagingProfileInput{
		Name:     "Jar Pack 200g",
		PackMode: "JAR_200G",
		IsActive: true,
		Components: []appInventory.PackagingProfileComponentInput{
			{PackingMaterialItemID: jarBody.ID, QtyPerUnit: 1},
			{PackingMaterialItemID: jarLid.ID, QtyPerUnit: 1},
		},
		AuthToken: probeAdminToken,
	})
	if err != nil {
		return fmt.Errorf("create packaging profile: %w", err)
	}

	items, err := svc.ListItems(appInventory.ListItemsInput{
		ActiveOnly: true,
		ItemType:   "PACKING_MATERIAL",
		AuthToken:  probeAdminToken,
	})
	if err != nil {
		return fmt.Errorf("list items: %w", err)
	}
	if len(items) < 2 {
		return fmt.Errorf("expected at least 2 packing material items, got %d", len(items))
	}
	profiles, err := svc.ListPackagingProfiles(appInventory.ListPackagingProfilesInput{
		ActiveOnly: true,
		AuthToken:  probeAdminToken,
	})
	if err != nil {
		return fmt.Errorf("list profiles: %w", err)
	}
	if len(profiles) != 1 {
		return fmt.Errorf("expected 1 packaging profile, got %d", len(profiles))
	}
	if len(profiles[0].Components) != 2 {
		return fmt.Errorf("expected 2 profile components, got %d", len(profiles[0].Components))
	}

	return nil
}
