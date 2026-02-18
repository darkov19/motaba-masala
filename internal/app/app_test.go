package app

import "testing"

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
