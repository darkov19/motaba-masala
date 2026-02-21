package main

import (
	"bufio"
	"context"
	"crypto/rand"
	_ "embed"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"masala_inventory_managment"
	"masala_inventory_managment/internal/app"
	appAdmin "masala_inventory_managment/internal/app/admin"
	appAuth "masala_inventory_managment/internal/app/auth"
	appLicenseMode "masala_inventory_managment/internal/app/licensemode"
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
	"strings"
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
var iconPNGData []byte

//go:embed assets/icon.ico
var iconICOData []byte

const (
	envAppEnvironment            = "MASALA_APP_ENV"
	envJWTSecret                 = "MASALA_JWT_SECRET"
	envLicensePublicKey          = "MASALA_LICENSE_PUBLIC_KEY"
	envBootstrapAdminUsername    = "MASALA_BOOTSTRAP_ADMIN_USERNAME"
	envBootstrapAdminPassword    = "MASALA_BOOTSTRAP_ADMIN_PASSWORD"
	defaultBootstrapAdminUser    = "admin"
	integrityRecoveryPrompt      = "⚠️ Database integrity issue detected. Restore from backup?"
	missingDBRecoveryPrompt      = "No database found. Restore from latest backup?"
	backupDiscoveryFailurePrompt = "⚠️ Recovery required, but backups could not be listed. Check backup directory permissions and retry restore."
	relaunchHelperArg            = "--relaunch-helper"
	relaunchAttempts             = 12
	envRelaunchWorkingDir        = "MASALA_RELAUNCH_WORKDIR"
	backgroundNotificationTitle  = "Masala Inventory is still running"
	backgroundNotificationBody   = "The server is now in the background. Use the tray icon to reopen or exit."
)

const defaultLicensePublicKey = "ebe55ca92c5a7161a80ce7718c7567e2566a6f51fb564f191bee61cb7b29d776"

type startupBackupLister interface {
	ListBackups() ([]string, error)
}

func isDevelopmentEnvironment() bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(envAppEnvironment))) {
	case "dev", "development", "local", "test":
		return true
	default:
		return false
	}
}

func resolveJWTSecret() (string, error) {
	secret := strings.TrimSpace(os.Getenv(envJWTSecret))
	if secret != "" {
		return secret, nil
	}

	if isDevelopmentEnvironment() {
		slog.Warn("Using dev-only fallback JWT secret; set MASALA_JWT_SECRET for secure environments")
		return "dev-only-jwt-secret-change-me", nil
	}

	return "", fmt.Errorf("%s must be set in non-development environments", envJWTSecret)
}

func resolveLicensePublicKey() string {
	if envKey := strings.TrimSpace(os.Getenv(envLicensePublicKey)); envKey != "" {
		return envKey
	}
	if strings.TrimSpace(LicensePublicKey) != "" {
		return strings.TrimSpace(LicensePublicKey)
	}
	return defaultLicensePublicKey
}

func generateSecurePassword(byteLen int) (string, error) {
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func resolveBootstrapAdminCredentials() (string, string, error) {
	username := strings.TrimSpace(os.Getenv(envBootstrapAdminUsername))
	if username == "" {
		username = defaultBootstrapAdminUser
	}

	password := strings.TrimSpace(os.Getenv(envBootstrapAdminPassword))
	if password == "" {
		generated, err := generateSecurePassword(24)
		if err != nil {
			return "", "", fmt.Errorf("failed to generate bootstrap password: %w", err)
		}
		password = generated
		slog.Warn(
			"Generated one-time bootstrap admin credentials. Store securely and rotate immediately after first login.",
			"username", username,
			"source", "generated",
		)
		return username, password, nil
	}

	if len(password) < 16 {
		return "", "", fmt.Errorf("%s must be at least 16 characters", envBootstrapAdminPassword)
	}

	slog.Info("Using bootstrap admin credentials from environment", "username", username, "source", envBootstrapAdminPassword)
	return username, password, nil
}

func determineRecoveryFromIntegrityCheck(integrityErr error, backupService startupBackupLister, currentBackups []string) (bool, string, []string, error) {
	if integrityErr == nil {
		return false, "", currentBackups, nil
	}

	backups, err := backupService.ListBackups()
	if err != nil {
		return true, integrityRecoveryPrompt, currentBackups, fmt.Errorf("failed to list backups for recovery mode: %w", err)
	}

	return true, integrityRecoveryPrompt, backups, nil
}

func resolveStartupRecoveryState(dbPath string, backupService startupBackupLister, availableBackups []string, backupErr error, integrityErr error) (bool, string, []string, error) {
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		if backupErr != nil {
			return true, backupDiscoveryFailurePrompt, availableBackups, nil
		}
		if len(availableBackups) > 0 {
			return true, missingDBRecoveryPrompt, availableBackups, nil
		}
	}

	if integrityErr == nil {
		return false, "", availableBackups, nil
	}

	recoveryMode, recoveryMessage, refreshedBackups, refreshErr := determineRecoveryFromIntegrityCheck(integrityErr, backupService, availableBackups)
	if refreshErr != nil {
		return recoveryMode, backupDiscoveryFailurePrompt, refreshedBackups, refreshErr
	}

	return recoveryMode, recoveryMessage, refreshedBackups, nil
}

func shouldEnterRecoveryOnConnectError(dbPath string, connectErr error) bool {
	if connectErr == nil {
		return false
	}
	if _, err := os.Stat(dbPath); err != nil {
		return false
	}

	msg := strings.ToLower(connectErr.Error())
	indicators := []string{
		"failed to apply pragma",
		"malformed database schema",
		"database schema is corrupt",
		"database disk image is malformed",
		"file is not a database",
		"database corrupt",
		"not a database",
	}
	for _, indicator := range indicators {
		if strings.Contains(msg, indicator) {
			return true
		}
	}

	return false
}

func main() {
	if err := run(); err != nil {
		log.Printf("Application failed to start: %v", err)
		os.Exit(1)
	}
}

func loadEnvFiles(paths ...string) {
	initialEnv := make(map[string]struct{})
	for _, kv := range os.Environ() {
		key, _, ok := strings.Cut(kv, "=")
		if ok && key != "" {
			initialEnv[key] = struct{}{}
		}
	}

	for _, path := range paths {
		f, err := os.Open(path)
		if err != nil {
			if !os.IsNotExist(err) {
				slog.Warn("Failed to open env file", "path", path, "error", err)
			}
			continue
		}

		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			key, value, ok := strings.Cut(line, "=")
			if !ok {
				continue
			}
			key = strings.TrimSpace(key)
			value = strings.TrimSpace(value)
			value = strings.Trim(value, `"'`)
			if key == "" {
				continue
			}
			if _, exists := initialEnv[key]; exists {
				continue
			}
			_ = os.Setenv(key, value)
		}
		if err := scanner.Err(); err != nil {
			slog.Warn("Failed to parse env file", "path", path, "error", err)
		}
		_ = f.Close()
	}
}

func run() error {
	loadEnvFiles(".env", ".env.development")

	if len(os.Args) > 1 && os.Args[1] == relaunchHelperArg {
		return runRelaunchHelper(os.Args[2:])
	}

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

		if err := startRelaunchHelper(); err != nil {
			slog.Error("Failed to trigger self-restart", "error", err)
			os.Exit(1)
		}

		slog.Info("Relaunch helper started. Exiting current instance.")
		os.Exit(0)
	})

	// Licensing Check
	LicensePublicKey = resolveLicensePublicKey()

	licenseSvc := license.NewLicensingService(LicensePublicKey, "license.key", ".hw_hb")
	lockoutMode := false
	lockoutReason := ""
	lockoutMessage := ""
	lockoutHardwareID := ""
	initialSnapshot, err := licenseSvc.GetCurrentStatus()
	if err != nil {
		if errors.Is(err, license.ErrHardwareIDMismatch) {
			lockoutMode = true
			lockoutReason = "hardware-mismatch"
			lockoutHardwareID = license.ExtractHardwareID(err)
			lockoutMessage = "Hardware ID Mismatch. Application is locked."
			slog.Error("Starting in license lockout mode", "error", err, "hardware_id", lockoutHardwareID)
		} else {
			return fmt.Errorf("licensing validation failed: %w", err)
		}
	} else if initialSnapshot.Status == license.StatusExpired {
		lockoutMode = true
		lockoutReason = "license-expired"
		lockoutHardwareID = initialSnapshot.HardwareID
		lockoutMessage = "License expired. Grace period ended. Application is locked."
		slog.Warn("Starting in license-expired lockout mode", "hardware_id", lockoutHardwareID, "expires_at", initialSnapshot.ExpiresAt)
	}

	if !lockoutMode {
		if err := licenseSvc.ValidateLicense(); err != nil {
			if errors.Is(err, license.ErrLicenseExpired) {
				latestSnapshot, statusErr := licenseSvc.GetCurrentStatus()
				if statusErr != nil {
					return fmt.Errorf("licensing validation failed: %w", err)
				}
				lockoutMode = true
				lockoutReason = "license-expired"
				lockoutHardwareID = latestSnapshot.HardwareID
				lockoutMessage = "License expired. Grace period ended. Application is locked."
			} else {
				return fmt.Errorf("licensing validation failed: %w", err)
			}
		}
	}

	application.SetLicenseStatusProvider(func() (app.LicenseStatus, error) {
		snapshot, err := licenseSvc.GetCurrentStatus()
		if err != nil {
			if errors.Is(err, license.ErrHardwareIDMismatch) {
				return app.LicenseStatus{
					Status:        string(license.StatusExpired),
					DaysRemaining: -7,
					Message:       "Hardware ID Mismatch. Application is locked.",
					HardwareID:    license.ExtractHardwareID(err),
				}, nil
			}
			return app.LicenseStatus{}, err
		}

		status := app.LicenseStatus{
			Status:        string(snapshot.Status),
			DaysRemaining: snapshot.DaysRemaining,
			ExpiresAt:     snapshot.ExpiresAt,
			HardwareID:    snapshot.HardwareID,
		}
		switch snapshot.Status {
		case license.StatusExpiring:
			status.Message = fmt.Sprintf("License expires in %d days. Contact support to renew.", snapshot.DaysRemaining)
		case license.StatusGracePeriod:
			status.Message = fmt.Sprintf("License Expired. Read-only mode active for %d more days.", 7+snapshot.DaysRemaining)
		case license.StatusExpired:
			status.Message = "License expired. Contact support to renew."
		}
		return status, nil
	})

	appLicenseMode.SetWriteEnforcer(func() error {
		snapshot, err := licenseSvc.GetCurrentStatus()
		if err != nil {
			if errors.Is(err, license.ErrHardwareIDMismatch) {
				return appLicenseMode.ErrReadOnlyMode
			}
			return err
		}
		if snapshot.Status == license.StatusGracePeriod {
			return appLicenseMode.ErrReadOnlyMode
		}
		if snapshot.Status == license.StatusExpired {
			return fmt.Errorf("%w: grace period ended", license.ErrLicenseExpired)
		}
		return nil
	})
	defer appLicenseMode.SetWriteEnforcer(nil)

	dbPath := "masala_inventory.db"
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

	var authService *appAuth.Service
	var reportService *appReport.AppService
	var adminService *appAdmin.Service
	recoveryMode := false
	recoveryMessage := ""
	availableBackups := []string{}

	dbManager := db.NewDatabaseManager(dbPath)
	backupService := infraBackup.NewService(dbManager, backupConfig, logInfo, logError)
	if !lockoutMode {
		backupErr := error(nil)
		availableBackups, backupErr = backupService.ListBackups()
		if backupErr != nil {
			availableBackups = []string{}
			slog.Error("Failed to list backups during startup", "error", backupErr)
		}

		startupRecoveryErr := error(nil)
		recoveryMode, recoveryMessage, availableBackups, startupRecoveryErr = resolveStartupRecoveryState(dbPath, backupService, availableBackups, backupErr, nil)
		if startupRecoveryErr != nil {
			slog.Error("Failed to resolve startup recovery state", "error", startupRecoveryErr)
		}

		if !recoveryMode {
			connectErr := dbManager.Connect()
			if connectErr != nil {
				if shouldEnterRecoveryOnConnectError(dbPath, connectErr) {
					recoveryMode, recoveryMessage, availableBackups, startupRecoveryErr = resolveStartupRecoveryState(dbPath, backupService, availableBackups, backupErr, connectErr)
					if startupRecoveryErr != nil {
						slog.Error("Failed to resolve recovery state after DB connect failure", "error", startupRecoveryErr)
					}
					if !recoveryMode {
						return fmt.Errorf("database connection failed: %w", connectErr)
					}
					slog.Error("Database connection failed due to corruption-like error; entering recovery mode", "error", connectErr)
				} else {
					return fmt.Errorf("database connection failed: %w", connectErr)
				}
			} else {
				defer dbManager.Close()

				if integrityErr := dbManager.IntegrityCheck(); integrityErr != nil {
					recoveryMode, recoveryMessage, availableBackups, startupRecoveryErr = resolveStartupRecoveryState(dbPath, backupService, availableBackups, backupErr, integrityErr)
					if startupRecoveryErr != nil {
						slog.Error("Failed to refresh backups for recovery mode", "error", startupRecoveryErr)
					}
					slog.Error("Database integrity check failed; entering recovery mode", "error", integrityErr)
				}
			}
		}

		if !recoveryMode {
			migrator := db.NewMigrator(dbManager)
			if err := migrator.RunMigrations(masala_inventory_managment.MigrationAssets, "internal/infrastructure/db/migrations"); err != nil {
				return fmt.Errorf("migration failed: %w", err)
			}

			userRepo := db.NewSqliteUserRepository(dbManager.GetDB())
			bcryptService := infraAuth.NewBcryptService()
			jwtSecret, err := resolveJWTSecret()
			if err != nil {
				return err
			}
			tokenService := infraAuth.NewTokenService(jwtSecret)
			authService = appAuth.NewService(userRepo, bcryptService, tokenService)
			reportService = appReport.NewAppService(authService)
			adminService = appAdmin.NewService(authService, backupService, licenseSvc, logError)

			userCount, err := userRepo.Count()
			if err != nil {
				return fmt.Errorf("failed to count existing users: %w", err)
			}
			if userCount == 0 {
				bootstrapUser, bootstrapPassword, err := resolveBootstrapAdminCredentials()
				if err != nil {
					return err
				}
				if err := authService.CreateUser("", bootstrapUser, bootstrapPassword, domainAuth.RoleAdmin); err != nil {
					return fmt.Errorf("failed to create bootstrap admin user: %w", err)
				}
			}

			if err := backupService.StartScheduler(); err != nil {
				slog.Error("Failed to start backup scheduler", "error", err, "component", "backup")
			}
			defer backupService.StopScheduler()
		}
	}

	appSys.SetRecoveryMode(recoveryMode)
	application.SetRecoveryState(recoveryMode, recoveryMessage, availableBackups)
	application.SetLicenseLockoutState(lockoutMode, lockoutReason, lockoutMessage, lockoutHardwareID)
	if recoveryMode {
		application.SetRestoreHandler(func(backupPath string) error {
			if err := backupService.Restore(backupPath); err != nil {
				return err
			}

			if err := startRelaunchHelper(); err != nil {
				return err
			}

			go func() {
				time.Sleep(100 * time.Millisecond)
				os.Exit(0)
			}()
			return nil
		})
	}

	bindings := []interface{}{application}
	if !recoveryMode && !lockoutMode {
		bindings = append(bindings, authService, reportService, adminService)
	}

	// Initialize Wails Options
	appOptions := &options.App{
		Title:             "Masala Inventory Server",
		Width:             1024,
		Height:            768,
		Frameless:         true,
		Fullscreen:        true,
		HideWindowOnClose: false, // Route close via OnBeforeClose for explicit logging + notifications
		AssetServer: &assetserver.Options{
			Assets: masala_inventory_managment.Assets,
		},
		BackgroundColour: &options.RGBA{R: 125, G: 17, B: 17, A: 1}, // Motaba Deep Maroon
		OnStartup: func(ctx context.Context) {
			application.Startup(ctx)
			monitorSvc.Start(ctx)
			runtime.WindowFullscreen(ctx)

			// Initialize System Tray
			// Note: We run this in a goroutine because Wails requires the main thread.
			// This works on Windows but causes SIGABRT on Linux due to GTK loop conflict.
			if stdruntime.GOOS != "linux" {
				go func() {
					systray.Run(func() {
						systray.SetTitle("Masala Server")
						systray.SetTooltip("Masala Inventory Server")
						if stdruntime.GOOS == "windows" && len(iconICOData) > 0 {
							systray.SetIcon(iconICOData)
						} else if len(iconPNGData) > 0 {
							systray.SetIcon(iconPNGData)
						}

						mOpen := systray.AddMenuItem("Open Dashboard", "Restore the server window")
						systray.AddSeparator()
						mQuit := systray.AddMenuItem("Exit Server", "Shutdown the server")

						// Keep onReady non-blocking; process menu events in a dedicated goroutine.
						go func() {
							for {
								select {
								case <-ctx.Done():
									return
									case <-mOpen.ClickedCh:
										slog.Info("Tray action", "action", "open-dashboard")
										runtime.WindowShow(ctx)
										runtime.WindowUnminimise(ctx)
										runtime.WindowFullscreen(ctx)
									case <-mQuit.ClickedCh:
										slog.Info("Tray action", "action", "exit-server")
										runtime.WindowShow(ctx)
										runtime.WindowUnminimise(ctx)
										runtime.WindowFullscreen(ctx)
										runtime.EventsEmit(ctx, "app:request-quit-confirm")
								}
							}
						}()
					}, func() {
						// Systray cleanup
					})
				}()
			} else {
				slog.Warn("System Tray is disabled on Linux to prevent GTK main loop conflicts with Wails.")
			}

			if stdruntime.GOOS == "windows" {
				go func() {
					iconPath := filepath.Join("cmd", "server", "assets", "icon.ico")
					for attempt := 1; attempt <= 40; attempt++ {
						if err := infraSys.SetWindowIconFromFile("Masala Inventory Server", iconPath); err == nil {
							slog.Info("Applied Windows window icon", "path", iconPath, "attempt", attempt)
							return
						}
						time.Sleep(250 * time.Millisecond)
					}
					slog.Warn("Failed to apply Windows window icon", "path", iconPath)
				}()
			}

			// Background watcher for cross-process focus pings (Linux/Unix support)
			go func() {
				pingFile := filepath.Join(os.TempDir(), "MasalaServerMutex.ping")
				for {
						if _, err := os.Stat(pingFile); err == nil {
							_ = os.Remove(pingFile)
							runtime.WindowShow(ctx)
							runtime.WindowUnminimise(ctx)
							runtime.WindowFullscreen(ctx)
							runtime.WindowSetAlwaysOnTop(ctx, true)
						go func() {
							time.Sleep(500 * time.Millisecond)
							runtime.WindowSetAlwaysOnTop(ctx, false)
						}()
					}
					time.Sleep(500 * time.Millisecond)
				}
			}()

			go func() {
				// Poll window state at a lower cadence; this is enough for UX notifications
				// and reduces repeated syscall work on long-running sessions.
				ticker := time.NewTicker(3 * time.Second)
				defer ticker.Stop()

				initialized := false
				lastMinimized := false
				notifiedWhileMinimized := false
				for {
					select {
					case <-ctx.Done():
						return
					case <-ticker.C:
						minimized := runtime.WindowIsMinimised(ctx)
						if stdruntime.GOOS == "windows" {
							// In steady minimized state we've already notified; skip extra window
							// enumeration until a potential restore transition is observed.
							if !lastMinimized || !notifiedWhileMinimized || !minimized {
								if winMinimized, err := infraSys.WindowIsCurrentProcessMinimized(); err == nil {
									minimized = winMinimized
								}
							} else {
								minimized = true
							}
						}
						if !initialized {
							lastMinimized = minimized
							initialized = true
							continue
						}
						if minimized && !lastMinimized {
							if err := infraSys.ShowNotification(backgroundNotificationTitle, backgroundNotificationBody); err != nil {
								slog.Error("Failed to show minimize notification", "error", err)
							}
							notifiedWhileMinimized = true
						}
						if !minimized {
							notifiedWhileMinimized = false
						}
						lastMinimized = minimized
					}
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
			slog.Info("OnBeforeClose: Window close request received (likely title bar X)")
			slog.Info("OnBeforeClose: Hiding window and backgrounding server")
			runtime.WindowHide(ctx)
			// AC #1: Notification bubble on minimize
			if err := infraSys.ShowNotification(backgroundNotificationTitle, backgroundNotificationBody); err != nil {
				slog.Error("Failed to show notification", "error", err)
			}
			runtime.EventsEmit(ctx, "server-minimized", nil)
			return true // Prevent close, just hide
		},
		Bind: bindings,
	}

	// Create application with options
	err = wails.Run(appOptions)

	if err != nil {
		return fmt.Errorf("wails run error: %w", err)
	}

	return nil
}

func startRelaunchHelper() error {
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to determine executable path for relaunch: %w", err)
	}

	workDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to determine current working directory for relaunch: %w", err)
	}

	helperArgs := append([]string{relaunchHelperArg}, os.Args[1:]...)
	cmd := exec.Command(executable, helperArgs...)
	cmd.Dir = workDir
	cmd.Env = append(os.Environ(), fmt.Sprintf("%s=%s", envRelaunchWorkingDir, workDir))
	detachProcess(cmd)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start relaunch helper: %w", err)
	}

	return nil
}

func runRelaunchHelper(forwardedArgs []string) error {
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to determine executable path in relaunch helper: %w", err)
	}
	launchDir := strings.TrimSpace(os.Getenv(envRelaunchWorkingDir))
	if launchDir == "" {
		if cwd, cwdErr := os.Getwd(); cwdErr == nil {
			launchDir = cwd
		}
	}

	baseDelay := 500 * time.Millisecond
	quickExitWindow := 3 * time.Second
	var lastErr error
	logPath := filepath.Join(os.TempDir(), "masala-relaunch-helper.log")
	writeRelaunchLog(logPath, "helper start executable=%s workdir=%s args=%v", executable, launchDir, forwardedArgs)
	for attempt := 1; attempt <= relaunchAttempts; attempt++ {
		if attempt > 1 {
			time.Sleep(time.Duration(attempt) * baseDelay)
		}

		cmd := exec.Command(executable, forwardedArgs...)
		if launchDir != "" {
			cmd.Dir = launchDir
		}
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		detachProcess(cmd)
		if err := cmd.Start(); err != nil {
			lastErr = fmt.Errorf("start attempt %d failed: %w", attempt, err)
			writeRelaunchLog(logPath, "attempt=%d start failed: %v", attempt, err)
			continue
		}
		writeRelaunchLog(logPath, "attempt=%d started pid=%d", attempt, cmd.Process.Pid)

		done := make(chan error, 1)
		go func(c *exec.Cmd) {
			done <- c.Wait()
		}(cmd)

		select {
		case exitErr := <-done:
			if exitErr != nil {
				lastErr = fmt.Errorf("relaunch attempt %d exited early: %w", attempt, exitErr)
				writeRelaunchLog(logPath, "attempt=%d exited early with error: %v", attempt, exitErr)
			} else {
				lastErr = fmt.Errorf("relaunch attempt %d exited early", attempt)
				writeRelaunchLog(logPath, "attempt=%d exited early without error", attempt)
			}
			continue
		case <-time.After(quickExitWindow):
			writeRelaunchLog(logPath, "attempt=%d success (alive for %s)", attempt, quickExitWindow)
			return nil
		}
	}

	if lastErr != nil {
		writeRelaunchLog(logPath, "helper failed after %d attempts: %v", relaunchAttempts, lastErr)
		return fmt.Errorf("failed to relaunch application after %d attempts: %w", relaunchAttempts, lastErr)
	}

	writeRelaunchLog(logPath, "helper failed after %d attempts: unknown error", relaunchAttempts)
	return fmt.Errorf("failed to relaunch application after %d attempts", relaunchAttempts)
}

func writeRelaunchLog(path string, format string, args ...interface{}) {
	line := fmt.Sprintf("%s %s\n", time.Now().Format(time.RFC3339Nano), fmt.Sprintf(format, args...))
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = f.WriteString(line)
}
