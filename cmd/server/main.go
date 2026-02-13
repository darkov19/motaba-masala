package main

import (
	"fmt"
	"log"
	"masala_inventory_managment"
	"masala_inventory_managment/internal/app"
	"masala_inventory_managment/internal/infrastructure/db"
	"masala_inventory_managment/internal/infrastructure/license"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

// LicensePublicKey can be set via -ldflags "-X main.LicensePublicKey=..."
var LicensePublicKey string

func main() {
	if err := run(); err != nil {
		log.Printf("Application failed to start: %v", err)
		os.Exit(1)
	}
}

func run() error {
	// Create an instance of the app structure
	application := app.NewApp(true) // Server instance

	// Licensing Check
	// The Public Key should be injected at build time using -ldflags
	// Example: -ldflags "-X main.LicensePublicKey=your_key"
	if LicensePublicKey == "" {
		// Fallback for dev/test if not provided, or error out
		// For this story, we keep the known dev key as default if not overridden
		LicensePublicKey = "ebe55ca92c5a7161a80ce7718c7567e2566a6f51fb564f191bee61cb7b29d776"
	}

	licenseSvc := license.NewLicensingService(LicensePublicKey, "license.key", ".hw_hb")
	if err := licenseSvc.ValidateLicense(); err != nil {
		return fmt.Errorf("licensing validation failed: %w", err)
	}

	// Initialize Database
	dbManager := db.NewDatabaseManager("masala_inventory.db")
	if err := dbManager.Connect(); err != nil {
		return fmt.Errorf("database connection failed: %w", err)
	}
	defer dbManager.Close()

	// Run Migrations
	migrator := db.NewMigrator(dbManager)
	if err := migrator.RunMigrations(masala_inventory_managment.MigrationAssets, "migrations"); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Masala Inventory Server",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: masala_inventory_managment.Assets,
		},
		BackgroundColour: &options.RGBA{R: 125, G: 17, B: 17, A: 1}, // Motaba Deep Maroon
		OnStartup:        application.Startup,
		Bind: []interface{}{
			application,
		},
	})

	if err != nil {
		return fmt.Errorf("wails run error: %w", err)
	}

	return nil
}
