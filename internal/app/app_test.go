package app

import (
	"errors"
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

func TestGreet_ClientModeReturnsErrorWhenProbeFails(t *testing.T) {
	a := NewApp(false)
	a.connectivityProbe = func() error {
		return errors.New("server process not reachable")
	}

	if _, err := a.Greet("ping"); err == nil {
		t.Fatal("expected greet probe to fail in client mode when server is unreachable")
	}
}

func TestGreet_ClientModeSucceedsWhenProbePasses(t *testing.T) {
	a := NewApp(false)
	a.connectivityProbe = func() error { return nil }

	msg, err := a.Greet("ping")
	if err != nil {
		t.Fatalf("expected greet to succeed, got error: %v", err)
	}
	if msg == "" {
		t.Fatal("expected non-empty greet message")
	}
}
