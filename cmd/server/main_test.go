package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"masala_inventory_managment/internal/infrastructure/license"
)

type mockBackupLister struct {
	backups []string
	err     error
}

func (m mockBackupLister) ListBackups() ([]string, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.backups, nil
}

func TestResolveStartupRecoveryState_ConnectFailureWithExistingDBEntersRecovery(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "masala_inventory.db")
	if err := os.WriteFile(dbPath, []byte("not-a-real-sqlite-db"), 0644); err != nil {
		t.Fatalf("failed to create temp db file: %v", err)
	}

	recovery, message, backups, err := resolveStartupRecoveryState(
		dbPath,
		mockBackupLister{backups: []string{"backups/backup-1.zip", "backups/backup-2.zip"}},
		[]string{},
		nil,
		errors.New("failed to apply pragma PRAGMA journal_mode=WAL"),
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !recovery {
		t.Fatal("expected recovery mode to be enabled")
	}
	if message != integrityRecoveryPrompt {
		t.Fatalf("expected integrity prompt, got %q", message)
	}
	if len(backups) != 2 {
		t.Fatalf("expected refreshed backups, got %#v", backups)
	}
}

func TestResolveStartupRecoveryState_BackupRefreshFailureUsesFallbackPrompt(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "masala_inventory.db")
	if err := os.WriteFile(dbPath, []byte("not-a-real-sqlite-db"), 0644); err != nil {
		t.Fatalf("failed to create temp db file: %v", err)
	}

	recovery, message, backups, err := resolveStartupRecoveryState(
		dbPath,
		mockBackupLister{err: errors.New("permission denied")},
		[]string{"backups/stale.zip"},
		nil,
		errors.New("database connection failed"),
	)
	if err == nil {
		t.Fatal("expected backup refresh error")
	}
	if !recovery {
		t.Fatal("expected recovery mode to stay enabled")
	}
	if message != backupDiscoveryFailurePrompt {
		t.Fatalf("expected fallback recovery prompt, got %q", message)
	}
	if len(backups) != 1 || backups[0] != "backups/stale.zip" {
		t.Fatalf("expected previous backup list to be preserved, got %#v", backups)
	}
}

type stubStartupLicenseService struct {
	snapshot    license.StatusSnapshot
	statusErr   error
	validateErr error
}

func (s stubStartupLicenseService) GetCurrentStatus() (license.StatusSnapshot, error) {
	return s.snapshot, s.statusErr
}

func (s stubStartupLicenseService) ValidateLicense() error {
	return s.validateErr
}

func TestEvaluateStartupLicenseState_ClockTamperFailureBlocksStartup(t *testing.T) {
	tamperErr := &license.ClockTamperError{
		LastHeartbeatUnix: 200,
		CurrentUnix:       100,
	}
	svc := stubStartupLicenseService{
		snapshot: license.StatusSnapshot{
			Status:     license.StatusActive,
			HardwareID: "hw-test",
		},
		validateErr: tamperErr,
	}

	lockoutMode, lockoutReason, lockoutMessage, lockoutHardwareID, err := evaluateStartupLicenseState(svc)
	if err != nil {
		t.Fatalf("expected lockout mode for clock tampering, got startup error: %v", err)
	}
	if !lockoutMode {
		t.Fatal("expected startup to continue in lockout mode for clock tampering")
	}
	if lockoutReason != "clock-tamper" {
		t.Fatalf("expected clock-tamper lockout reason, got %q", lockoutReason)
	}
	if lockoutHardwareID != "hw-test" {
		t.Fatalf("expected hardware id in clock-tamper lockout, got %q", lockoutHardwareID)
	}
	if !strings.Contains(strings.ToLower(lockoutMessage), "clock tampering detected") {
		t.Fatalf("expected tamper lockout message, got: %s", lockoutMessage)
	}
}
