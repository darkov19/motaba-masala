package app

import (
	"context"
	"fmt"
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
}

// NewApp creates a new App application struct
func NewApp(isServer bool) *App {
	return &App{
		isServer: isServer,
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

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
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
