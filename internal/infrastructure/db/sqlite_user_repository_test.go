package db

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"masala_inventory_managment/internal/domain/auth"
)

func TestSqliteUserRepository_CRUDAndManagement(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "repo_int_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "repo_test.db")
	manager := NewDatabaseManager(dbPath)
	if err := manager.Connect(); err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer manager.Close()

	query := `CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL,
		is_active BOOLEAN DEFAULT TRUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`
	if _, err := manager.GetDB().Exec(query); err != nil {
		t.Fatalf("failed to create users table: %v", err)
	}

	repo := NewSqliteUserRepository(manager.GetDB())

	admin := auth.NewUser("admin", "admin_hash", auth.RoleAdmin)
	if err := repo.Save(admin); err != nil {
		t.Fatalf("save admin failed: %v", err)
	}

	operator := auth.NewUser("operator", "operator_hash", auth.RoleDataEntryOperator)
	operator.IsActive = false
	operator.UpdatedAt = time.Now()
	if err := repo.Save(operator); err != nil {
		t.Fatalf("save operator failed: %v", err)
	}

	foundUser, err := repo.FindByUsername("admin")
	if err != nil {
		t.Fatalf("FindByUsername failed: %v", err)
	}
	if foundUser == nil || foundUser.Username != "admin" || foundUser.Role != auth.RoleAdmin || !foundUser.IsActive {
		t.Fatalf("unexpected admin user: %#v", foundUser)
	}

	count, err := repo.Count()
	if err != nil {
		t.Fatalf("Count failed: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected count 2, got %d", count)
	}

	users, err := repo.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(users) != 2 {
		t.Fatalf("expected 2 users from list, got %d", len(users))
	}

	if err := repo.UpdateRole("operator", auth.RoleAdmin); err != nil {
		t.Fatalf("UpdateRole failed: %v", err)
	}
	updatedOperator, err := repo.FindByUsername("operator")
	if err != nil {
		t.Fatalf("FindByUsername operator failed: %v", err)
	}
	if updatedOperator == nil || updatedOperator.Role != auth.RoleAdmin {
		t.Fatalf("expected operator role to be Admin, got %#v", updatedOperator)
	}

	if err := repo.SetActive("operator", true); err != nil {
		t.Fatalf("SetActive failed: %v", err)
	}
	updatedOperator, err = repo.FindByUsername("operator")
	if err != nil {
		t.Fatalf("FindByUsername operator failed: %v", err)
	}
	if updatedOperator == nil || !updatedOperator.IsActive {
		t.Fatalf("expected operator to be active, got %#v", updatedOperator)
	}

	if err := repo.UpdatePasswordHash("operator", "rotated_hash"); err != nil {
		t.Fatalf("UpdatePasswordHash failed: %v", err)
	}
	updatedOperator, err = repo.FindByUsername("operator")
	if err != nil {
		t.Fatalf("FindByUsername operator failed: %v", err)
	}
	if updatedOperator == nil || updatedOperator.PasswordHash != "rotated_hash" {
		t.Fatalf("expected updated password hash, got %#v", updatedOperator)
	}

	activeAdmins, err := repo.CountActiveAdmins()
	if err != nil {
		t.Fatalf("CountActiveAdmins failed: %v", err)
	}
	if activeAdmins != 2 {
		t.Fatalf("expected 2 active admins, got %d", activeAdmins)
	}

	if err := repo.DeleteByUsername("operator"); err != nil {
		t.Fatalf("DeleteByUsername failed: %v", err)
	}
	deleted, err := repo.FindByUsername("operator")
	if err != nil {
		t.Fatalf("FindByUsername deleted user failed: %v", err)
	}
	if deleted != nil {
		t.Fatalf("expected deleted user to be nil, got %#v", deleted)
	}
}
