package app

import (
	"errors"
	"os"
	"testing"
)

func TestRestoreBackup_RequiresRecoveryMode(t *testing.T) {
	a := NewApp(true)
	a.SetRestoreHandler(func(string) error { return nil })

	if err := a.RestoreBackup("backups/backup-1.zip"); err == nil {
		t.Fatal("expected restore to be rejected outside recovery mode")
	}
}

func TestRestoreBackup_CallsHandlerInRecoveryMode(t *testing.T) {
	a := NewApp(true)
	a.SetRecoveryState(true, "recovery", []string{"backups/backup-1.zip"})

	called := false
	a.SetRestoreHandler(func(path string) error {
		called = path == "backups/backup-1.zip"
		return nil
	})

	if err := a.RestoreBackup("backups/backup-1.zip"); err != nil {
		t.Fatalf("expected restore to succeed in recovery mode, got %v", err)
	}
	if !called {
		t.Fatal("expected restore handler to be called")
	}
}

func TestGetLicenseStatus_UsesConfiguredProvider(t *testing.T) {
	a := NewApp(true)
	a.SetLicenseStatusProvider(func() (LicenseStatus, error) {
		return LicenseStatus{Status: "grace-period", DaysRemaining: -2}, nil
	})

	status, err := a.GetLicenseStatus()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if status.Status != "grace-period" || status.DaysRemaining != -2 {
		t.Fatalf("unexpected status: %+v", status)
	}
}

func TestGetLicenseLockoutState_ReturnsConfiguredState(t *testing.T) {
	a := NewApp(true)
	a.SetLicenseLockoutState(true, "hardware-mismatch", "Hardware ID Mismatch. Application is locked.", "machine-123")

	lockout := a.GetLicenseLockoutState()
	if !lockout.Enabled {
		t.Fatal("expected lockout to be enabled")
	}
	if lockout.Reason != "hardware-mismatch" {
		t.Fatalf("expected lockout reason to match, got %q", lockout.Reason)
	}
	if lockout.HardwareID != "machine-123" {
		t.Fatalf("expected hardware id to match, got %q", lockout.HardwareID)
	}
}

func TestGreet_ClientModeSucceedsWithoutConnectivityProbe(t *testing.T) {
	a := NewApp(false)

	msg, err := a.Greet("ping")
	if err != nil {
		t.Fatalf("expected greet to succeed, got error: %v", err)
	}
	if msg == "" {
		t.Fatal("expected non-empty greet message")
	}
}

func TestCheckServerReachability_ReturnsFalseWhenNetworkAndProbeFail(t *testing.T) {
	t.Setenv(envServerProbeAddr, "127.0.0.1:1")
	t.Setenv(envLocalSingleMachine, "0")

	a := NewApp(false)
	a.connectivityProbe = func() error {
		return errors.New("server process not reachable")
	}

	connected, err := a.CheckServerReachability()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if connected {
		t.Fatal("expected reachability to be false")
	}
}

func TestCheckServerReachability_UsesLocalDevFallbackProbe(t *testing.T) {
	t.Setenv(envServerProbeAddr, "127.0.0.1:1")
	t.Setenv(envLocalSingleMachine, "1")

	a := NewApp(false)
	a.connectivityProbe = func() error { return nil }

	connected, err := a.CheckServerReachability()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !connected {
		t.Fatal("expected reachability true via local-dev process fallback")
	}
}

func TestCheckServerReachability_DefaultsToLocalProcessProbeWhenNoServerAddrConfigured(t *testing.T) {
	t.Setenv(envServerProbeAddr, "")
	t.Setenv(envLocalSingleMachine, "0")

	a := NewApp(false)
	a.connectivityProbe = func() error { return nil }

	connected, err := a.CheckServerReachability()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !connected {
		t.Fatal("expected reachability true via default local process probe path")
	}
}

func TestResolveProbeAddress(t *testing.T) {
	if got := resolveProbeAddress(""); got != defaultServerProbeAddr {
		t.Fatalf("expected default addr %q, got %q", defaultServerProbeAddr, got)
	}
	if got := resolveProbeAddress("http://10.0.0.5:8090/health"); got != "10.0.0.5:8090" {
		t.Fatalf("expected parsed host:port, got %q", got)
	}
	if got := resolveProbeAddress("10.0.0.7:9000"); got != "10.0.0.7:9000" {
		t.Fatalf("expected raw host:port passthrough, got %q", got)
	}
}

func TestIsLocalSingleMachineModeEnabled(t *testing.T) {
	t.Setenv(envLocalSingleMachine, "true")
	if !isLocalSingleMachineModeEnabled() {
		t.Fatal("expected local single machine mode to be enabled")
	}

	t.Setenv(envLocalSingleMachine, "0")
	if isLocalSingleMachineModeEnabled() {
		t.Fatal("expected local single machine mode to be disabled")
	}
}

func TestMain(m *testing.M) {
	// Ensure tests don't inherit machine-specific probe settings.
	_ = os.Unsetenv(envServerProbeAddr)
	_ = os.Unsetenv(envLocalSingleMachine)
	os.Exit(m.Run())
}
