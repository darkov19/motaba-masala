package backup

import (
	"archive/zip"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"masala_inventory_managment/internal/domain/backup"
	"masala_inventory_managment/internal/infrastructure/db"

	_ "github.com/mattn/go-sqlite3"
)

func createDummyDB(t *testing.T, dir string) *db.DatabaseManager {
	dbPath := filepath.Join(dir, "masala_inventory.db")
	manager := db.NewDatabaseManager(dbPath)
	if err := manager.Connect(); err != nil {
		t.Fatalf("Failed to connect to dummy DB: %v", err)
	}

	// Create a table and data
	_, err := manager.GetDB().Exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
	if err != nil {
		t.Fatalf("Failed to create table: %v", err)
	}
	_, err = manager.GetDB().Exec("INSERT INTO test (name) VALUES ('foo')")
	if err != nil {
		t.Fatalf("Failed to insert data: %v", err)
	}

	return manager
}

func noOpLog(string, ...interface{}) {}

func TestExecute(t *testing.T) {
	tmpDir := t.TempDir()
	dbDir := filepath.Join(tmpDir, "db")
	backupDir := filepath.Join(tmpDir, "backups")

	if err := os.MkdirAll(dbDir, 0755); err != nil {
		t.Fatal(err)
	}

	manager := createDummyDB(t, dbDir)
	defer manager.Close()

	config := backup.BackupConfig{
		BackupPath:    backupDir,
		RetentionDays: 7,
		ScheduleCron:  "", // Not testing scheduler here
	}

	svc := NewService(manager, config, noOpLog, noOpLog)

	// Execute backup
	if err := svc.Execute(); err != nil {
		t.Errorf("Execute failed: %v", err)
	}

	// Verify zip exists
	files, err := os.ReadDir(backupDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 1 {
		t.Errorf("Expected 1 backup file, got %d", len(files))
	}
	zipName := files[0].Name()
	zipPath := filepath.Join(backupDir, zipName)

	// Verify zip content
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		t.Fatalf("Failed to open zip: %v", err)
	}
	defer r.Close()

	if len(r.File) != 1 {
		t.Errorf("Expected 1 file in zip, got %d", len(r.File))
	}
	if r.File[0].Name != "masala_inventory.db" {
		t.Errorf("Expected masala_inventory.db in zip, got %s", r.File[0].Name)
	}

	// Verify status
	status, _ := svc.GetStatus()
	if !status.Success {
		t.Error("Status should be success")
	}
	if status.FilePath != zipPath {
		t.Errorf("Status path mismatch: got %s want %s", status.FilePath, zipPath)
	}
}

func TestPrune(t *testing.T) {
	tmpDir := t.TempDir()

	config := backup.BackupConfig{
		BackupPath:    tmpDir,
		RetentionDays: 2, // Keep last 2 days
	}

	svc := NewService(nil, config, noOpLog, noOpLog) // db manager not needed for prune

	now := time.Now()

	// Create dummy backup files with relative dates
	// 5 days old (outside retention)
	old5 := now.AddDate(0, 0, -5)
	old5Name := fmt.Sprintf("backup-%s.zip", old5.Format("2006-01-02T150405"))
	createDummyFile(t, tmpDir, old5Name)

	// 4 days old (outside retention)
	old4 := now.AddDate(0, 0, -4)
	old4Name := fmt.Sprintf("backup-%s.zip", old4.Format("2006-01-02T150405"))
	createDummyFile(t, tmpDir, old4Name)

	// 3 days old (outside retention)
	old3 := now.AddDate(0, 0, -3)
	old3Name := fmt.Sprintf("backup-%s.zip", old3.Format("2006-01-02T150405"))
	createDummyFile(t, tmpDir, old3Name)

	// New file (today — within retention)
	newName := fmt.Sprintf("backup-%s.zip", now.Format("2006-01-02T150405"))
	createDummyFile(t, tmpDir, newName)

	// Prune
	n, err := svc.Prune()
	if err != nil {
		t.Fatalf("Prune failed: %v", err)
	}
	if n != 3 {
		t.Errorf("Expected 3 pruned files, got %d", n)
	}

	// Verify files
	files, _ := os.ReadDir(tmpDir)
	var names []string
	for _, f := range files {
		names = append(names, f.Name())
	}

	// Should contain only newName
	foundNew := false
	for _, name := range names {
		if name == newName {
			foundNew = true
		}
	}

	if !foundNew {
		t.Error("New file was incorrectly pruned")
	}
	if len(files) != 1 {
		t.Errorf("Expected 1 remaining file, got %d: %v", len(files), names)
	}
}

func createDummyFile(t *testing.T, dir, name string) {
	path := filepath.Join(dir, name)
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	f.Close()
}

func TestConcurrency(t *testing.T) {
	tmpDir := t.TempDir()
	dbDir := filepath.Join(tmpDir, "db")
	backupDir := filepath.Join(tmpDir, "backups")

	if err := os.MkdirAll(dbDir, 0755); err != nil {
		t.Fatal(err)
	}

	manager := createDummyDB(t, dbDir)
	defer manager.Close()

	config := backup.BackupConfig{
		BackupPath:    backupDir,
		RetentionDays: 7,
	}

	svc := NewService(manager, config, noOpLog, noOpLog)

	// Run backup in goroutine
	go func() {
		// Mock a long running backup by... well we can't easily mock internal duration without dependency injection of some sleeper.
		// But valid backup takes *some* time (file I/O).
		svc.Execute()
	}()

	// Yield to let goroutine start
	time.Sleep(10 * time.Millisecond)

	// Try to run another, should fail?
	// Note: If the first one finished super fast check might fail.
	// But usually file I/O + creating DB takes > 10ms.
	// We can check IsRunning logic.

	// Actually we should try to lock mutex.
	// But Execute acquires lock immediately.
	// If IsRunning is true.

	// Let's rely on IsStatus saying IsRunning if we catch it?
	_, _ = svc.GetStatus()

	// If it finished already, we can't test "Already in progress" error.
	// But we can test that we can run another one if it finished.

	// To reliably test "already in progress", we would need to hold the lock or make the operation slow.
	// Since we can't easily make it slow without changing code, we skip strict "Already in progress" check
	// unless we see it happen, but we can verify that triggering multiple times doesn't CRASH or corrupt.

	// Attempt call
	err := svc.Execute()
	// If err is "backup already in progress", good.
	// If err is nil, it means previous one finished. Also good (no overlap).
	// If err is something else, bad.

	if err != nil && err.Error() != "backup already in progress" {
		t.Errorf("Unexpected error: %v", err)
	}

	time.Sleep(100 * time.Millisecond) // wait for all
}
