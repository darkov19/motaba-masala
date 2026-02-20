package main

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	domainBackup "masala_inventory_managment/internal/domain/backup"
	infraBackup "masala_inventory_managment/internal/infrastructure/backup"
	"masala_inventory_managment/internal/infrastructure/db"
)

func TestDetermineRecoveryFromIntegrityCheck_EntersRecoveryMode(t *testing.T) {
	backupDir := t.TempDir()
	backupFile := filepath.Join(backupDir, "backup-2026-02-18T120000.zip")
	if err := os.WriteFile(backupFile, []byte("dummy"), 0644); err != nil {
		t.Fatalf("failed to create backup file: %v", err)
	}

	backupService := infraBackup.NewService(nil, domainBackup.BackupConfig{BackupPath: backupDir}, func(string, ...interface{}) {}, func(string, ...interface{}) {})
	recoveryMode, recoveryMessage, backups, err := determineRecoveryFromIntegrityCheck(errors.New("integrity check failed"), backupService, nil)
	if err != nil {
		t.Fatalf("expected backup refresh to succeed, got error: %v", err)
	}
	if !recoveryMode {
		t.Fatalf("expected recovery mode to be enabled")
	}
	if recoveryMessage != integrityRecoveryPrompt {
		t.Fatalf("unexpected recovery message: %s", recoveryMessage)
	}
	if len(backups) != 1 || backups[0] != backupFile {
		t.Fatalf("unexpected backups list: %#v", backups)
	}
}

func TestResolveStartupRecoveryState_IntegrityFailureTransitionsToRecoveryMode(t *testing.T) {
	backupDir := t.TempDir()
	dbPath := filepath.Join(t.TempDir(), "masala_inventory.db")
	if err := os.WriteFile(dbPath, []byte("db-placeholder"), 0644); err != nil {
		t.Fatalf("failed to create db placeholder: %v", err)
	}

	backupFile := filepath.Join(backupDir, "backup-2026-02-18T120000.zip")
	if err := os.WriteFile(backupFile, []byte("dummy"), 0644); err != nil {
		t.Fatalf("failed to create backup file: %v", err)
	}

	backupService := infraBackup.NewService(nil, domainBackup.BackupConfig{BackupPath: backupDir}, func(string, ...interface{}) {}, func(string, ...interface{}) {})
	recoveryMode, recoveryMessage, backups, err := resolveStartupRecoveryState(
		dbPath,
		backupService,
		[]string{},
		nil,
		errors.New("integrity check failed"),
	)
	if err != nil {
		t.Fatalf("expected no error resolving recovery state, got: %v", err)
	}
	if !recoveryMode {
		t.Fatalf("expected recovery mode to be enabled")
	}
	if recoveryMessage != integrityRecoveryPrompt {
		t.Fatalf("unexpected recovery message: %s", recoveryMessage)
	}
	if len(backups) != 1 || backups[0] != backupFile {
		t.Fatalf("unexpected backups list: %#v", backups)
	}
}

func TestDetermineRecoveryFromIntegrityCheck_SurfacesBackupListError(t *testing.T) {
	failingLister := &failingBackupLister{}
	recoveryMode, recoveryMessage, backups, err := determineRecoveryFromIntegrityCheck(errors.New("integrity check failed"), failingLister, []string{"existing-backup.zip"})
	if !recoveryMode {
		t.Fatalf("expected recovery mode to be enabled")
	}
	if recoveryMessage != integrityRecoveryPrompt {
		t.Fatalf("unexpected recovery message: %s", recoveryMessage)
	}
	if err == nil {
		t.Fatal("expected backup-listing error to be returned")
	}
	if len(backups) != 1 || backups[0] != "existing-backup.zip" {
		t.Fatalf("expected existing backups to be preserved, got: %#v", backups)
	}
}

func TestStartupIntegrityFailurePath_EntersRecoveryMode(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "masala_inventory.db")
	backupDir := filepath.Join(tempDir, "backups")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		t.Fatalf("failed to create backup dir: %v", err)
	}

	backupFile := filepath.Join(backupDir, "backup-2026-02-18T120000.zip")
	if err := os.WriteFile(backupFile, []byte("dummy"), 0644); err != nil {
		t.Fatalf("failed to create backup file: %v", err)
	}

	dbManager := db.NewDatabaseManager(dbPath)
	if err := dbManager.Connect(); err != nil {
		t.Fatalf("database connect failed: %v", err)
	}
	t.Cleanup(func() { _ = dbManager.Close() })

	backupService := infraBackup.NewService(
		dbManager,
		domainBackup.BackupConfig{BackupPath: backupDir},
		func(string, ...interface{}) {},
		func(string, ...interface{}) {},
	)

	availableBackups, backupErr := backupService.ListBackups()
	if backupErr != nil {
		t.Fatalf("unexpected backup listing error: %v", backupErr)
	}

	// Integration-style startup path: backup discovery is real; integrity failure is
	// injected at decision point to validate recovery-mode transition behavior.
	integrityErr := errors.New("integrity check failed")

	recoveryMode, recoveryMessage, resolvedBackups, resolveErr := resolveStartupRecoveryState(
		dbPath,
		backupService,
		availableBackups,
		backupErr,
		integrityErr,
	)
	if resolveErr != nil {
		t.Fatalf("unexpected recovery state resolution error: %v", resolveErr)
	}
	if !recoveryMode {
		t.Fatal("expected recovery mode to be enabled")
	}
	if recoveryMessage != integrityRecoveryPrompt {
		t.Fatalf("unexpected recovery prompt: %q", recoveryMessage)
	}
	if len(resolvedBackups) != 1 || resolvedBackups[0] != backupFile {
		t.Fatalf("unexpected resolved backups list: %#v", resolvedBackups)
	}
}

func TestStartupMalformedDatabasePath_EntersRecoveryMode(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "masala_inventory.db")
	backupDir := filepath.Join(tempDir, "backups")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		t.Fatalf("failed to create backup dir: %v", err)
	}

	// Corruption fixture: write non-SQLite bytes so startup connect path fails.
	if err := os.WriteFile(dbPath, []byte("not-a-sqlite-database"), 0644); err != nil {
		t.Fatalf("failed to write malformed db fixture: %v", err)
	}

	backupFile := filepath.Join(backupDir, "backup-2026-02-20T110000.zip")
	if err := os.WriteFile(backupFile, []byte("dummy"), 0644); err != nil {
		t.Fatalf("failed to create backup file: %v", err)
	}

	dbManager := db.NewDatabaseManager(dbPath)
	backupService := infraBackup.NewService(
		dbManager,
		domainBackup.BackupConfig{BackupPath: backupDir},
		func(string, ...interface{}) {},
		func(string, ...interface{}) {},
	)

	availableBackups, backupErr := backupService.ListBackups()
	if backupErr != nil {
		t.Fatalf("unexpected backup listing error: %v", backupErr)
	}

	connectErr := dbManager.Connect()
	if connectErr == nil {
		_ = dbManager.Close()
		t.Fatal("expected malformed sqlite fixture to fail database connect")
	}
	if !shouldEnterRecoveryOnConnectError(dbPath, connectErr) {
		t.Fatalf("expected connect error to trigger recovery path, got: %v", connectErr)
	}

	recoveryMode, recoveryMessage, resolvedBackups, resolveErr := resolveStartupRecoveryState(
		dbPath,
		backupService,
		availableBackups,
		backupErr,
		connectErr,
	)
	if resolveErr != nil {
		t.Fatalf("unexpected recovery state resolution error: %v", resolveErr)
	}
	if !recoveryMode {
		t.Fatal("expected recovery mode to be enabled")
	}
	if recoveryMessage != integrityRecoveryPrompt {
		t.Fatalf("unexpected recovery prompt: %q", recoveryMessage)
	}
	if len(resolvedBackups) != 1 || resolvedBackups[0] != backupFile {
		t.Fatalf("unexpected resolved backups list: %#v", resolvedBackups)
	}
}

type failingBackupLister struct{}

func (f *failingBackupLister) ListBackups() ([]string, error) {
	return nil, errors.New("backup listing failed")
}
