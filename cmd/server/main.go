package main

import (
	"fmt"
	"log"
	"log/slog"
	"masala_inventory_managment"
	"masala_inventory_managment/internal/app"
	appAdmin "masala_inventory_managment/internal/app/admin"
	appAuth "masala_inventory_managment/internal/app/auth"
	appReport "masala_inventory_managment/internal/app/report"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	domainBackup "masala_inventory_managment/internal/domain/backup"
	infraAuth "masala_inventory_managment/internal/infrastructure/auth"
	infraBackup "masala_inventory_managment/internal/infrastructure/backup"
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
	if err := migrator.RunMigrations(masala_inventory_managment.MigrationAssets, "internal/infrastructure/db/migrations"); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	// Initialize Auth Components
	userRepo := db.NewSqliteUserRepository(dbManager.GetDB())
	bcryptService := infraAuth.NewBcryptService()
	// TODO: Load secret from env/config
	tokenService := infraAuth.NewTokenService("super-secret-key-change-me")
	authService := appAuth.NewService(userRepo, bcryptService, tokenService)

	// Initialize Report Service (Secured)
	reportService := appReport.NewAppService(authService)

	// Initialize Backup Service with structured logging (per tech spec observability requirements)
	backupConfig := domainBackup.BackupConfig{
		BackupPath:    "backups",
		RetentionDays: 7,
		ScheduleCron:  "0 2 * * *",
	}
	logInfo := func(format string, v ...interface{}) {
		slog.Info(fmt.Sprintf(format, v...), "component", "backup")
	}
	logError := func(format string, v ...interface{}) {
		slog.Error(fmt.Sprintf(format, v...), "component", "backup")
	}

	backupService := infraBackup.NewService(dbManager, backupConfig, logInfo, logError)
	if err := backupService.StartScheduler(); err != nil {
		slog.Error("Failed to start backup scheduler", "error", err, "component", "backup")
	}
	defer backupService.StopScheduler() // Graceful shutdown: stop scheduler when app exits

	// Initialize Admin Service
	adminService := appAdmin.NewService(authService, backupService, licenseSvc, logError)

	// Bootstrap Admin User
	// This uses an empty token to bypass auth checks during initial bootstrap.
	// CreateUser internally allows empty-token calls for first-time setup only.
	// The error is intentionally ignored: if the admin user already exists, this is a no-op.
	_ = authService.CreateUser("", "admin", "admin", domainAuth.RoleAdmin)

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
			authService,   // Bind Auth Service to Wails
			reportService, // Bind Report Service (Secured)
			adminService,  // Bind Admin Service (Secured)
		},
	})

	if err != nil {
		return fmt.Errorf("wails run error: %w", err)
	}

	return nil
}
