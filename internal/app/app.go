package app

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"os/exec"
	"runtime"
	"strings"
)

type RecoveryState struct {
	Enabled bool     `json:"enabled"`
	Message string   `json:"message"`
	Backups []string `json:"backups"`
}

type LicenseStatus struct {
	Status        string `json:"status"`
	DaysRemaining int    `json:"days_remaining"`
	ExpiresAt     string `json:"expires_at,omitempty"`
	Message       string `json:"message,omitempty"`
	HardwareID    string `json:"hardware_id,omitempty"`
}

type LicenseLockoutState struct {
	Enabled    bool   `json:"enabled"`
	Reason     string `json:"reason,omitempty"`
	Message    string `json:"message"`
	HardwareID string `json:"hardware_id,omitempty"`
}

// App struct
type App struct {
	ctx                   context.Context
	isServer              bool
	forceQuit             bool
	recoveryState         RecoveryState
	restoreHandler        func(string) error
	licenseStatusProvider func() (LicenseStatus, error)
	lockoutState          LicenseLockoutState
	connectivityProbe     func() error
}

// NewApp creates a new App application struct
func NewApp(isServer bool) *App {
	connectivityProbe := func() error { return nil }
	if !isServer {
		connectivityProbe = probeLocalServerProcess
	}

	return &App{
		isServer: isServer,
		connectivityProbe: connectivityProbe,
		licenseStatusProvider: func() (LicenseStatus, error) {
			return LicenseStatus{Status: "active", DaysRemaining: 0}, nil
		},
	}
}

// Startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

// Context returns the app context
func (a *App) Context() context.Context {
	return a.ctx
}

func (a *App) IsServerMode() bool {
	return a.isServer
}

// Greet also acts as a lightweight connectivity probe for client instances.
// In client mode this method fails when the local server process is not reachable.
func (a *App) Greet(name string) (string, error) {
	if !a.isServer && a.connectivityProbe != nil {
		if err := a.connectivityProbe(); err != nil {
			return "", err
		}
	}
	return fmt.Sprintf("Hello %s, It's show time!", name), nil
}

func probeLocalServerProcess() error {
	candidates := []string{
		"masala_inventory_server.exe",
		"masala_inventory_server",
		"masala_inventory_managment.exe",
		"masala_inventory_managment",
		"server.exe",
		"server",
	}

	for _, candidate := range candidates {
		running, err := isProcessRunning(candidate)
		if err != nil {
			return err
		}
		if running {
			return nil
		}
	}

	return fmt.Errorf("server process not reachable")
}

func isProcessRunning(processName string) (bool, error) {
	switch runtime.GOOS {
	case "windows":
		target := processName
		if !strings.HasSuffix(strings.ToLower(target), ".exe") {
			target += ".exe"
		}

		out, err := newProbeCommand("tasklist", "/FO", "CSV", "/NH", "/FI", "IMAGENAME eq "+target).CombinedOutput()
		if err != nil {
			return false, fmt.Errorf("tasklist probe failed: %w", err)
		}

		reader := csv.NewReader(strings.NewReader(string(out)))
		for {
			record, readErr := reader.Read()
			if readErr == io.EOF {
				break
			}
			if readErr != nil {
				break
			}
			if len(record) == 0 {
				continue
			}

			imageName := strings.TrimSpace(record[0])
			if strings.EqualFold(imageName, target) {
				return true, nil
			}
		}

		lowerOut := strings.ToLower(string(out))
		if strings.Contains(lowerOut, strings.ToLower(target)) {
			return true, nil
		}
		return false, nil
	default:
		cmd := newProbeCommand("pgrep", "-f", processName)
		if err := cmd.Run(); err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
				return false, nil
			}
			return false, fmt.Errorf("pgrep probe failed: %w", err)
		}
		return true, nil
	}
}

// SetForceQuit allows bypassing the minimize-to-tray logic
func (a *App) SetForceQuit(force bool) {
	a.forceQuit = force
}

// IsForceQuit returns whether the app should actually quit
func (a *App) IsForceQuit() bool {
	return a.forceQuit
}

// SetRecoveryState configures server recovery mode details for the frontend.
func (a *App) SetRecoveryState(enabled bool, message string, backups []string) {
	a.recoveryState = RecoveryState{
		Enabled: enabled,
		Message: message,
		Backups: backups,
	}
}

// GetRecoveryState returns current recovery mode state.
func (a *App) GetRecoveryState() RecoveryState {
	return a.recoveryState
}

// SetRestoreHandler configures the restore callback used by RestoreBackup.
func (a *App) SetRestoreHandler(handler func(string) error) {
	a.restoreHandler = handler
}

// RestoreBackup restores a selected backup and triggers restart logic via configured handler.
func (a *App) RestoreBackup(backupPath string) error {
	if !a.recoveryState.Enabled {
		return fmt.Errorf("restore is only available in recovery mode")
	}
	if a.restoreHandler == nil {
		return fmt.Errorf("restore handler is not configured")
	}
	return a.restoreHandler(backupPath)
}

func (a *App) SetLicenseStatusProvider(provider func() (LicenseStatus, error)) {
	if provider == nil {
		a.licenseStatusProvider = func() (LicenseStatus, error) {
			return LicenseStatus{Status: "active", DaysRemaining: 0}, nil
		}
		return
	}
	a.licenseStatusProvider = provider
}

func (a *App) GetLicenseStatus() (LicenseStatus, error) {
	return a.licenseStatusProvider()
}

func (a *App) SetLicenseLockoutState(enabled bool, reason, message, hardwareID string) {
	a.lockoutState = LicenseLockoutState{
		Enabled:    enabled,
		Reason:     reason,
		Message:    message,
		HardwareID: hardwareID,
	}
}

func (a *App) GetLicenseLockoutState() LicenseLockoutState {
	return a.lockoutState
}
