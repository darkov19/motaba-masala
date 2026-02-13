package db

import (
	"masala_inventory_managment/internal/domain/auth"
	"os"
	"path/filepath"
	"testing"
)

func TestSqliteUserRepository_CRUD(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "repo_int_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "repo_test.db")
	manager := NewDatabaseManager(dbPath)
	if err := manager.Connect(); err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer manager.Close()

	// Direct schema creation for test isolation (normally run migrations, but for repo test we just need the table)
	query := `CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`
	_, err = manager.GetDB().Exec(query)
	if err != nil {
		t.Fatalf("Failed to create users table: %v", err)
	}

	repo := NewSqliteUserRepository(manager.GetDB())

	// 1. Test Save
	user := auth.NewUser("testuser", "hashed_pass", auth.RoleAdmin)
	err = repo.Save(user)
	if err != nil {
		t.Errorf("Save failed: %v", err)
	}

	// 2. Test FindByUsername
	foundUser, err := repo.FindByUsername("testuser")
	if err != nil {
		t.Errorf("FindByUsername failed: %v", err)
	}
	if foundUser == nil {
		t.Fatal("Expected to find user, got nil")
	}
	if foundUser.Username != "testuser" {
		t.Errorf("Expected username testuser, got %s", foundUser.Username)
	}
	if foundUser.Role != auth.RoleAdmin {
		t.Errorf("Expected role Admin, got %s", foundUser.Role)
	}

	// 3. Test Count
	count, err := repo.Count()
	if err != nil {
		t.Errorf("Count failed: %v", err)
	}
	if count != 1 {
		t.Errorf("Expected count 1, got %d", count)
	}
}
