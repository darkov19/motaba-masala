package db

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDatabaseManager_Connect(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "db_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	manager := NewDatabaseManager(dbPath)

	if err := manager.Connect(); err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer manager.Close()

	if manager.GetDB() == nil {
		t.Fatal("DB instance is nil")
	}

	// Verify WAL mode
	var journalMode string
	err = manager.GetDB().QueryRow("PRAGMA journal_mode").Scan(&journalMode)
	if err != nil {
		t.Fatalf("Failed to query journal mode: %v", err)
	}
	if journalMode != "wal" {
		t.Errorf("Expected journal mode wal, got %s", journalMode)
	}
}

func TestDatabaseManager_IntegrityCheck(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "db_integrity_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	manager := NewDatabaseManager(dbPath)

	if err := manager.Connect(); err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer manager.Close()

	if err := manager.IntegrityCheck(); err != nil {
		t.Fatalf("Expected integrity check success, got %v", err)
	}
}

func TestDatabaseManager_IntegrityCheck_NotConnected(t *testing.T) {
	manager := NewDatabaseManager(filepath.Join(t.TempDir(), "not-connected.db"))
	if err := manager.IntegrityCheck(); err == nil {
		t.Fatal("Expected error for non-connected database")
	}
}
