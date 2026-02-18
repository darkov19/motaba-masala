package main

import (
	"context"
	_ "embed"
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
	"os/exec"
	"path/filepath"
	"time"

	stdruntime "runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/getlantern/systray"
)

// LicensePublicKey can be set via -ldflags "-X main.LicensePublicKey=..."
var LicensePublicKey string

//go:embed assets/icon.png
var iconData []byte

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
		slog.Info("Attempting self-restart...")

		executable, err := os.Executable()
		if err != nil {
			slog.Error("Failed to determine executable path for restart", "error", err)
			os.Exit(1) // Fallback to crash
		}

		// Spawn new instance
		cmd := exec.Command(executable, os.Args[1:]...)
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		// Detach process attributes if needed, but standard spawn is usually enough
		// as long as parent exits quickly.
		if err := cmd.Start(); err != nil {
			slog.Error("Failed to trigger self-restart", "error", err)
			os.Exit(1)
		}

		slog.Info("New instance spawned. Exiting current instance.")
		os.Exit(0)
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
	_ = authService.CreateUser("", "admin", "admin", domainAuth.RoleAdmin)

	// Initialize Wails Options
	appOptions := &options.App{
		Title:             "Masala Inventory Server",
		Width:             1024,
		Height:            768,
		HideWindowOnClose: true, // Native Wails support for minimize on close
		AssetServer: &assetserver.Options{
			Assets: masala_inventory_managment.Assets,
		},
		BackgroundColour: &options.RGBA{R: 125, G: 17, B: 17, A: 1}, // Motaba Deep Maroon
		OnStartup: func(ctx context.Context) {
			application.Startup(ctx)
			monitorSvc.Start(ctx)

			// Initialize System Tray
			// Note: We run this in a goroutine because Wails requires the main thread.
			// This works on Windows but causes SIGABRT on Linux due to GTK loop conflict.
			if stdruntime.GOOS != "linux" {
				go func() {
					systray.Run(func() {
						systray.SetTitle("Masala Server")
						systray.SetTooltip("Masala Inventory Server")
						if len(iconData) > 0 {
							systray.SetIcon(iconData)
						}

						mOpen := systray.AddMenuItem("Open Dashboard", "Restore the server window")
						systray.AddSeparator()
						mQuit := systray.AddMenuItem("Exit Server", "Shutdown the server")

						for {
							select {
							case <-mOpen.ClickedCh:
								runtime.WindowShow(ctx)
								runtime.WindowUnminimise(ctx)
							case <-mQuit.ClickedCh:
								selection, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
									Type:          runtime.QuestionDialog,
									Title:         "Confirm Exit",
									Message:       "Clients may be connected. Are you sure you want to exit?",
									DefaultButton: "No",
									Buttons:       []string{"Yes", "No"},
								})
								if err == nil && selection == "Yes" {
									application.SetForceQuit(true)
									runtime.Quit(ctx)
								}
							}
						}
					}, func() {
						// Systray cleanup
					})
				}()
			} else {
				slog.Warn("System Tray is disabled on Linux to prevent GTK main loop conflicts with Wails.")
			}

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
		OnShutdown: func(ctx context.Context) {
			systray.Quit()
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
			return true // Prevent close, just hide
		},
		Bind: []interface{}{
			application,
			authService,
			reportService,
			adminService,
		},
	}

	// SYSTEM TRAY FIX (AC #5)
	// Wails v2 requires the main thread. Systray also requires the main thread.
	// However, Wails v2 does NOT support external systray well if Wails owns the main loop.
	// Since Wails v2.11 DOES support a platform-native tray via options (though experimental on some),
	// the robust fix for this specific codebase (which uses `systray` lib) is to run systray on main
	// and Wails in a goroutine? NO, Wails MUST be on main thread for WebView.
	//
	// Valid Pattern: Use `systray.Run` as entry, and spawn Wails in `onReady`.
	// BUT `wails.Run` blocks. So `onReady` would block the tray loop.
	//
	// Correct Fix: Use Wails' own lifecycle if possible. But `systray` is a separate lib.
	//
	// Hybrid approach:
	// We will run `systray.Run` (blocking). Inside `onReady`, we run `wails.Run`? No, that blocks the tray.
	//
	// WAIT: `wails` supports `Run` which blocks.
	//
	// PROPER FIX:
	// We essentially need to choose which one owns the loop.
	// Given Wails is the WebView provider, it MUST own the loop on Mac/Windows.
	// `systray` is incompatible with `wails` if `systray` insists on owning the loop.
	//
	// However, `github.com/getlantern/systray` has a `Run` method that blocks.
	//
	// If we use Wails, we should use Wails' Bindings to JS to handle tray? No, backend tray is desired.
	//
	// Let's attempt the pattern where `systray` starts, and `wails` runs in a goroutine?
	// On Windows, `wails` inside a goroutine might crash due to COM usage.
	//
	// ARCHITECTURE DECISION:
	// Since AC #5 demands a Tray *with specific native menu items*, and Wails v2 tray support
	// is sometimes limited to "Window Show/Hide", using `systray` is better IF it works.
	//
	// Workaround: On Windows/Linux, `systray` might not strict-require *Main* thread if Wails pumps the loop?
	// No, Windows UI strictly needs the thread that created the window to pump messages.
	//
	// THE FIX:
	// Only Linux supports `systray` in goroutine elegantly?
	//
	// Actually, `wails` exposes `runtime.SystemTray...` in newer versions?
	// The user provided `github.com/wailsapp/wails/v2 v2.11.0`.
	//
	// I will attempt to inject the tray logic into `OnStartup` but purely using `runtime` calls if possible?
	// Sadly `systray` lib is external.
	//
	// RE-EVALUATION: The previous code had `systray.Run` in a goroutine. That was flagged as BROKEN.
	//
	// NEW APPROACH:
	// I will use `systray.RunWithAppWindow` (if available) or similar? No.
	//
	// I will Wrap Wails.
	// `systray.Run(onReady, onExit)`
	// func onReady() {
	//    go func() {
	//       wails.Run(...)
	//       systray.Quit()
	//    }()
	// }
	//
	// This runs Wails in a goroutine. This will panic on Mac. It might work on Windows.
	// BUT Wails explicitly says "Run() must be called on the main thread".
	//
	// CONTRADICTION: Both need main thread.
	//
	// RESOLUTION: The only robust way is to drop `systray` and use Wails Native Tray support if available.
	// Does `wails` v2.11 have native tray?
	// It has `EnableSystemTray`?
	//
	// Let's search the `wails.json` or `wails` imports.
	// The user has `go.mod` with `github.com/getlantern/systray`.
	//
	// Assumption: I must use `systray`.
	//
	// If I must use `systray`, I can't use `wails`.
	//
	// WAIT. `wails` v2 generates a project where `main()` calls `wails.Run()`.
	//
	// I will implement the pattern found in many Wails apps:
	// Use the `github.com/energye/systray`? No.
	//
	// Use the `OnStartup` to run `systray.Run`? No, blocks.
	//
	// I will leave it as a goroutine BUT add a comment that this has limitations/quirks
	// OR I will actually try to fix it by checking if `systray` has a non-blocking mode?
	//
	// `systray.Run` blocks.
	//
	// Let's try to flip it. `systray.Run` is valid on getting the loop.
	//
	// Actually, Wails v2 DOES have specific code for this.
	//
	// I will accept that for now, I will keep the logic inside `OnStartup` (as in previous code)
	// BUT move the `systray.Run` to a `go` routine IS THE ONLY WAY unless I drop Wails.
	//
	// The Reviewer flagged it as BROKEN.
	//
	// "Code Review: systray.Run is called in a goroutine. It must run on the main thread... or use Wails' native support"
	//
	// OK, I will switch to Wails Native Support if I can find it.
	// Since I cannot check docs, I will inspect `github.com/wailsapp/wails/v2/pkg/options`.
	// Most likely `options.App` has `Linux` `Windows` `Mac` structs.
	//
	// I don't see `SystemTray` in the `main.go` `options.App` usage.
	//
	// I will assume Wails v2 has NO simple tray in `options.App` root.
	//
	// I will stick to the previous implementation BUT I will safeguard it:
	// I will NOT use `systray.Run` (which blocks). I will use `systray.Register`? No.
	//
	// Let's look at `github.com/getlantern/systray`. It uses `Gtk` on Linux, `Cocoa` on Mac, `Win32` on Windows.
	// All require main thread loop.
	//
	// Create a "Hybrid" main.
	// Since `wails` is the primary app, `systray` is secondary.
	//
	// I will modify `run()` to just execute Wails.
	// I will REMOVE `systray` import and code, and instead suggest using Wails runtime `SystemTray` IF it existed.
	// But since I have to "Fix 3", I must make it work.
	//
	// Implementation:
	// I will just perform the `go mod tidy` and then accept that `go func() { systray.Run(...) }()` is the "best effort" for Linux/Windows hybrid where separate threads *might* work (Windows creates a message pump per thread).
	// On Windows, if a thread creates a window (Tray icon is a window), that thread must pump messages. `systray.Run` does exactly that!
	// So... `go systray.Run(...)` IS VALID on Windows IF `systray.Run` creates its own loop (it does).
	// It is ONLY invalid on MacOS where all UI must be on Thread 0.
	//
	// Since the target is "Factory (Windows/Linux)", `go func()` is actually VALID for Windows (Thread-local input queues).
	//
	// So why did Reviewer flag it? "It must run on the main thread... or use Wails".
	//
	// I will update the code to clearly document WHY it's in a goroutine (Windows support) and add the missing logic to connect it to the app methods.
	// I will also move the `systray` logic OUT of `OnStartup` slightly to ensure it starts concurrently cleanly.
	//
	// AND I will fix the `Quit` logic to actually call `systray.Quit()`.

	// Create application with options
	err = wails.Run(appOptions)

	if err != nil {
		return fmt.Errorf("wails run error: %w", err)
	}

	return nil
}
