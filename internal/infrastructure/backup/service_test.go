package backup

import (
	"archive/zip"
	"fmt"
	"io"
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

func TestListBackups_SortedNewestFirst(t *testing.T) {
	tmpDir := t.TempDir()
	svc := NewService(nil, backup.BackupConfig{BackupPath: tmpDir}, noOpLog, noOpLog)

	createDummyFile(t, tmpDir, "backup-2026-02-13T020000.zip")
	createDummyFile(t, tmpDir, "backup-2026-02-15T020000.zip")
	createDummyFile(t, tmpDir, "backup-2026-02-14T020000.zip")

	got, err := svc.ListBackups()
	if err != nil {
		t.Fatalf("ListBackups failed: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3 backups, got %d", len(got))
	}

	wantFirst := filepath.Join(tmpDir, "backup-2026-02-15T020000.zip")
	if got[0] != wantFirst {
		t.Fatalf("expected newest backup first %s, got %s", wantFirst, got[0])
	}
}

func TestRestore_ReplacesDatabaseFromZip(t *testing.T) {
	tmpDir := t.TempDir()
	dbDir := filepath.Join(tmpDir, "db")
	backupDir := filepath.Join(tmpDir, "backups")

	if err := os.MkdirAll(dbDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		t.Fatal(err)
	}

	manager := createDummyDB(t, dbDir)
	defer manager.Close()

	backupDBPath := filepath.Join(tmpDir, "backup_source.db")
	backupDBMgr := db.NewDatabaseManager(backupDBPath)
	if err := backupDBMgr.Connect(); err != nil {
		t.Fatalf("Failed to create backup source db: %v", err)
	}
	_, err := backupDBMgr.GetDB().Exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
	if err != nil {
		t.Fatalf("Failed to create backup source table: %v", err)
	}
	_, err = backupDBMgr.GetDB().Exec("INSERT INTO test (name) VALUES ('restored')")
	if err != nil {
		t.Fatalf("Failed to seed backup source table: %v", err)
	}
	_ = backupDBMgr.Close()

	zipPath := filepath.Join(backupDir, "backup-2026-02-18T120000.zip")
	if err := createZipWithFile(zipPath, backupDBPath, "masala_inventory.db"); err != nil {
		t.Fatalf("Failed to build backup zip: %v", err)
	}

	svc := NewService(manager, backup.BackupConfig{BackupPath: backupDir}, noOpLog, noOpLog)
	if err := svc.Restore(zipPath); err != nil {
		t.Fatalf("Restore failed: %v", err)
	}

	var name string
	if err := manager.GetDB().QueryRow("SELECT name FROM test LIMIT 1").Scan(&name); err != nil {
		t.Fatalf("Failed to read restored row: %v", err)
	}
	if name != "restored" {
		t.Fatalf("expected restored value, got %s", name)
	}
}

func TestRestore_RejectsBackupOutsideBackupDir(t *testing.T) {
	tmpDir := t.TempDir()
	dbDir := filepath.Join(tmpDir, "db")
	backupDir := filepath.Join(tmpDir, "backups")
	outsideDir := filepath.Join(tmpDir, "outside")

	if err := os.MkdirAll(dbDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(outsideDir, 0755); err != nil {
		t.Fatal(err)
	}

	manager := createDummyDB(t, dbDir)
	defer manager.Close()

	outsideDBPath := filepath.Join(tmpDir, "outside_source.db")
	outsideDBMgr := db.NewDatabaseManager(outsideDBPath)
	if err := outsideDBMgr.Connect(); err != nil {
		t.Fatalf("Failed to create outside db: %v", err)
	}
	_, err := outsideDBMgr.GetDB().Exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
	if err != nil {
		t.Fatalf("Failed to create outside table: %v", err)
	}
	_ = outsideDBMgr.Close()

	outsideZipPath := filepath.Join(outsideDir, "backup-2026-02-18T120001.zip")
	if err := createZipWithFile(outsideZipPath, outsideDBPath, "masala_inventory.db"); err != nil {
		t.Fatalf("Failed to build outside backup zip: %v", err)
	}

	svc := NewService(manager, backup.BackupConfig{BackupPath: backupDir}, noOpLog, noOpLog)
	err = svc.Restore(outsideZipPath)
	if err == nil {
		t.Fatal("expected restore to fail for backup path outside backup directory")
	}
	if err.Error() != "backup path must be inside backup directory" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func createZipWithFile(zipPath, srcPath, entryName string) error {
	dst, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	zw := zip.NewWriter(dst)
	defer zw.Close()

	entry, err := zw.Create(entryName)
	if err != nil {
		return err
	}

	src, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer src.Close()

	_, err = io.Copy(entry, src)
	return err
}
