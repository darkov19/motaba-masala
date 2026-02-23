package app

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
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

type LockoutRetryResult struct {
	Passed  bool   `json:"passed"`
	Message string `json:"message"`
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
	lockoutRetryHandler   func() (LockoutRetryResult, error)
}

const (
	defaultServerProbeAddr = "127.0.0.1:8090"
	envServerProbeAddr     = "MASALA_SERVER_PROBE_ADDR"
	envLocalSingleMachine  = "MASALA_LOCAL_SINGLE_MACHINE_MODE"
	serverProbeTimeout     = 1500 * time.Millisecond
)

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

func (a *App) Greet(name string) (string, error) {
	return fmt.Sprintf("Hello %s, It's show time!", name), nil
}

// CheckServerReachability probes server reachability for client-mode connectivity status.
// Behavior:
//   - If MASALA_SERVER_PROBE_ADDR is set: use network probe for that target.
//   - If not set: use local process probe by default (single-machine compatibility).
//   - Optional local-dev fallback can be enabled via MASALA_LOCAL_SINGLE_MACHINE_MODE=1
//     to use process probing when explicit network probe fails.
func (a *App) CheckServerReachability() (bool, error) {
	if a.isServer {
		return true, nil
	}

	rawProbeAddr := strings.TrimSpace(os.Getenv(envServerProbeAddr))
	if rawProbeAddr == "" {
		if a.connectivityProbe != nil {
			if err := a.connectivityProbe(); err == nil {
				return true, nil
			}
		}
		// Secondary fallback for environments with a local TCP server but no process match.
		if err := probeTCPAddress(defaultServerProbeAddr); err == nil {
			return true, nil
		}
		return false, nil
	}

	probeAddr := resolveProbeAddress(rawProbeAddr)
	if err := probeTCPAddress(probeAddr); err == nil {
		return true, nil
	}

	if isLocalSingleMachineModeEnabled() && a.connectivityProbe != nil {
		if err := a.connectivityProbe(); err == nil {
			return true, nil
		}
	}

	return false, nil
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

func resolveProbeAddress(raw string) string {
	probe := strings.TrimSpace(raw)
	if probe == "" {
		return defaultServerProbeAddr
	}

	if strings.Contains(probe, "://") {
		if parsed, err := url.Parse(probe); err == nil {
			host := strings.TrimSpace(parsed.Host)
			if host != "" {
				return host
			}
		}
	}

	return probe
}

func probeTCPAddress(address string) error {
	conn, err := net.DialTimeout("tcp", address, serverProbeTimeout)
	if err != nil {
		return err
	}
	_ = conn.Close()
	return nil
}

func isLocalSingleMachineModeEnabled() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv(envLocalSingleMachine)))
	return raw == "1" || raw == "true" || raw == "yes"
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

func (a *App) SetLockoutRetryHandler(handler func() (LockoutRetryResult, error)) {
	a.lockoutRetryHandler = handler
}

func (a *App) RetryLockoutValidation() (LockoutRetryResult, error) {
	if a.lockoutRetryHandler == nil {
		return LockoutRetryResult{
			Passed:  false,
			Message: "Retry validation is not configured for this mode.",
		}, nil
	}
	return a.lockoutRetryHandler()
}
