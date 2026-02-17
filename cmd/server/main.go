package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"masala_inventory_managment"
	"masala_inventory_managment/internal/app"
	appAdmin "masala_inventory_managment/internal/app/admin"
	appAuth "masala_inventory_managment/internal/app/auth"
	appReport "masala_inventory_managment/internal/app/report"
	appSys "masala_inventory_managment/internal/app/system"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	domainBackup "masala_inventory_managment/internal/domain/backup"
	infraAuth "masala_inventory_managment/internal/infrastructure/auth"
	infraBackup "masala_inventory_managment/internal/infrastructure/backup"
	"masala_inventory_managment/internal/infrastructure/db"
	"masala_inventory_managment/internal/infrastructure/license"
	infraSys "masala_inventory_managment/internal/infrastructure/system"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
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
	// Task 1: Single Instance Lock
	pingFile := filepath.Join(os.TempDir(), "MasalaServerMutex.ping")
	_ = os.Remove(pingFile) // Cleanup any stale pings from previous crashes
	sysMonitor := infraSys.NewMonitor()
	exists, err := sysMonitor.CheckMutex("MasalaServerMutex")
	if err != nil {
		slog.Error("Failed to check single instance mutex", "error", err)
	}
	if exists {
		slog.Info("Another instance is already running. Requesting focus and exiting.")
		// We'll update FocusWindow to handle the event emission for Linux
		_ = sysMonitor.FocusWindow("Masala Inventory Server")

		// Small delay to allow potential async operations (though os.Exit is abrupt)
		time.Sleep(100 * time.Millisecond)
		os.Exit(0)
	}

	// Create an instance of the app structure
	application := app.NewApp(true) // Server instance

	// Task 3: Watchdog Service
	watchdog := infraSys.NewWatchdog(30)

	// Task 4 & 5: Monitor Service (Refactored)
	monitorSvc := appSys.NewMonitorService(sysMonitor, watchdog)

	watchdog.Start(context.Background(), func() {
		monitorSvc.HandleWatchdogFailure()
		os.Exit(1) // Enabled for production auto-restart
	})

	// Licensing Check
	if LicensePublicKey == "" {
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

	// Initialize Services
	userRepo := db.NewSqliteUserRepository(dbManager.GetDB())
	bcryptService := infraAuth.NewBcryptService()
	tokenService := infraAuth.NewTokenService("super-secret-key-change-me")
	authService := appAuth.NewService(userRepo, bcryptService, tokenService)
	reportService := appReport.NewAppService(authService)

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
	defer backupService.StopScheduler()

	adminService := appAdmin.NewService(authService, backupService, licenseSvc, logError)

	// Bootstrap Admin User
	// This uses an empty token to bypass auth checks during initial bootstrap.
	// CreateUser internally allows empty-token calls for first-time setup only.
	// The error is intentionally ignored: if the admin user already exists, this is a no-op.
	_ = authService.CreateUser("", "admin", "admin", domainAuth.RoleAdmin)

	// Create System Tray Menu
	trayMenu := menu.NewMenu()
	trayMenu.Append(menu.Text("Open Dashboard", keys.CmdOrCtrl("o"), func(_ *menu.CallbackData) {
		if application.Context() != nil {
			runtime.WindowShow(application.Context())
			runtime.WindowUnminimise(application.Context())
		}
	}))
	trayMenu.Append(menu.Separator())
	trayMenu.Append(menu.Text("Exit Server", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		if application.Context() != nil {
			selection, err := runtime.MessageDialog(application.Context(), runtime.MessageDialogOptions{
				Type:          runtime.QuestionDialog,
				Title:         "Confirm Exit",
				Message:       "Clients may be connected. Are you sure you want to exit?",
				DefaultButton: "No",
				Buttons:       []string{"Yes", "No"},
			})
			if err == nil && selection == "Yes" {
				application.SetForceQuit(true)
				runtime.Quit(application.Context())
			}
		}
	}))

	// Create application with options
	err = wails.Run(&options.App{
		Title:             "Masala Inventory Server",
		Width:             1024,
		Height:            768,
		HideWindowOnClose: false,
		AssetServer: &assetserver.Options{
			Assets: masala_inventory_managment.Assets,
		},
		BackgroundColour: &options.RGBA{R: 125, G: 17, B: 17, A: 1}, // Motaba Deep Maroon
		// In Wails v2, the tray is often handled via platform-specific options or a separate call.
		// For this implementation, we will bind the menu and ensure the logic is available.
		// Note: System Tray implementation requires platform-specific bindings in Wails v2 (e.g. windows.Options, mac.Options)
		// or specific runtime calls. For now, the implementation logic is preserved but not wired.
		// TODO: Wire up trayMenu using correct Wails v2.11.0 API (likely requires platform specific options).
		OnStartup: func(ctx context.Context) {
			application.Startup(ctx)
			monitorSvc.Start(ctx)

			// Background watcher for cross-process focus pings (Linux/Unix support)
			go func() {
				pingFile := filepath.Join(os.TempDir(), "MasalaServerMutex.ping")
				for {
					if _, err := os.Stat(pingFile); err == nil {
						_ = os.Remove(pingFile)
						runtime.WindowShow(ctx)
						runtime.WindowUnminimise(ctx)
						runtime.WindowSetAlwaysOnTop(ctx, true)
						go func() {
							time.Sleep(500 * time.Millisecond)
							runtime.WindowSetAlwaysOnTop(ctx, false)
						}()
					}
					time.Sleep(500 * time.Millisecond)
				}
			}()
		},
		OnBeforeClose: func(ctx context.Context) bool {
			if application.IsForceQuit() {
				slog.Info("OnBeforeClose: Force quit detected, allowing close")
				return false // Allow close
			}
			slog.Info("OnBeforeClose: Hiding window and backgrounding server")
			runtime.WindowHide(ctx)
			// AC #1: Notification bubble on minimize
			if err := infraSys.ShowNotification("Server Backgrounded", "Server is running in background. Use the system tray to open or exit."); err != nil {
				slog.Error("Failed to show notification", "error", err)
			}
			runtime.EventsEmit(ctx, "server-minimized", nil)
			return true // Handled by hiding
		},
		Bind: []interface{}{
			application,
			authService,
			reportService,
			adminService,
		},
	})

	if err != nil {
		return fmt.Errorf("wails run error: %w", err)
	}

	return nil
}
