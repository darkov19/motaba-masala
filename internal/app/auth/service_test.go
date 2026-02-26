package auth_test

import (
	"database/sql"
	"strings"
	"testing"
	"time"

	"masala_inventory_managment/internal/app/auth"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	infraAuth "masala_inventory_managment/internal/infrastructure/auth"
)

type mockUserRepo struct {
	users map[string]*domainAuth.User
}

func (m *mockUserRepo) Save(user *domainAuth.User) error {
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now()
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = user.CreatedAt
	}
	if !user.IsActive {
		// keep explicit false value
	} else {
		user.IsActive = true
	}
	m.users[user.Username] = cloneUser(user)
	return nil
}

func (m *mockUserRepo) FindByUsername(username string) (*domainAuth.User, error) {
	user, ok := m.users[username]
	if !ok {
		return nil, nil
	}
	return cloneUser(user), nil
}

func (m *mockUserRepo) Count() (int, error) {
	return len(m.users), nil
}

func (m *mockUserRepo) List() ([]domainAuth.User, error) {
	users := make([]domainAuth.User, 0, len(m.users))
	for _, user := range m.users {
		users = append(users, *cloneUser(user))
	}
	return users, nil
}

func (m *mockUserRepo) UpdateRole(username string, role domainAuth.Role) error {
	user, ok := m.users[username]
	if !ok {
		return sql.ErrNoRows
	}
	user.Role = role
	user.UpdatedAt = time.Now()
	return nil
}

func (m *mockUserRepo) SetActive(username string, isActive bool) error {
	user, ok := m.users[username]
	if !ok {
		return sql.ErrNoRows
	}
	user.IsActive = isActive
	user.UpdatedAt = time.Now()
	return nil
}

func (m *mockUserRepo) UpdatePasswordHash(username, passwordHash string) error {
	user, ok := m.users[username]
	if !ok {
		return sql.ErrNoRows
	}
	user.PasswordHash = passwordHash
	user.UpdatedAt = time.Now()
	return nil
}

func (m *mockUserRepo) DeleteByUsername(username string) error {
	if _, ok := m.users[username]; !ok {
		return sql.ErrNoRows
	}
	delete(m.users, username)
	return nil
}

func (m *mockUserRepo) CountActiveAdmins() (int, error) {
	count := 0
	for _, user := range m.users {
		if user.Role == domainAuth.RoleAdmin && user.IsActive {
			count++
		}
	}
	return count, nil
}

func cloneUser(user *domainAuth.User) *domainAuth.User {
	copy := *user
	return &copy
}

func seedUser(t *testing.T, repo *mockUserRepo, bcrypt *infraAuth.BcryptService, username, password string, role domainAuth.Role, isActive bool) {
	t.Helper()
	hash, err := bcrypt.HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password for %s: %v", username, err)
	}
	user := domainAuth.NewUser(username, hash, role)
	user.IsActive = isActive
	if err := repo.Save(user); err != nil {
		t.Fatalf("failed to seed user %s: %v", username, err)
	}
}

func TestService_CreateUser_Security(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{users: make(map[string]*domainAuth.User)}
	svc := auth.NewService(repo, bcrypt, tokenSvc)

	err := svc.CreateUser("", "admin1", "pass1", domainAuth.RoleAdmin)
	if err != nil {
		t.Errorf("bootstrap: expected no error for first user, got %v", err)
	}

	err = svc.CreateUser("", "user2", "pass2", domainAuth.RoleDataEntryOperator)
	if err == nil {
		t.Error("expected error for unauthorized user creation (no token), got nil")
	}

	deoUser := &domainAuth.User{Username: "operator", Role: domainAuth.RoleDataEntryOperator}
	deoToken, _ := tokenSvc.GenerateToken(deoUser)
	err = svc.CreateUser(deoToken.Token, "user3", "pass3", domainAuth.RoleDataEntryOperator)
	if err == nil {
		t.Error("expected error for DataEntryOperator creating users, got nil")
	}

	adminUser := &domainAuth.User{Username: "admin1", Role: domainAuth.RoleAdmin}
	adminToken, _ := tokenSvc.GenerateToken(adminUser)
	err = svc.CreateUser(adminToken.Token, "user4", "pass4", domainAuth.RoleDataEntryOperator)
	if err != nil {
		t.Errorf("admin: expected no error for user creation, got %v", err)
	}
}

func TestService_CreateUser_ValidationAndLoginFlow(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{users: make(map[string]*domainAuth.User)}
	svc := auth.NewService(repo, bcrypt, tokenSvc)

	if err := svc.CreateUser("", "admin1", "secure-pass", domainAuth.RoleAdmin); err != nil {
		t.Fatalf("expected bootstrap admin creation success, got %v", err)
	}

	adminToken, err := svc.Login("admin1", "secure-pass")
	if err != nil {
		t.Fatalf("expected admin login success, got %v", err)
	}
	if strings.TrimSpace(adminToken.Token) == "" {
		t.Fatalf("expected issued token")
	}

	if _, err := svc.Login("admin1", "bad-pass"); err == nil {
		t.Fatalf("expected invalid credentials error for bad password")
	}

	if err := svc.CreateUser(adminToken.Token, "admin1", "another-pass", domainAuth.RoleDataEntryOperator); err == nil {
		t.Fatalf("expected duplicate username validation error")
	}

	if err := svc.CreateUser(adminToken.Token, "admin2", "another-pass", domainAuth.Role("superadmin")); err == nil {
		t.Fatalf("expected invalid role validation error")
	}
}

func TestService_LoginRejectsDisabledUser(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{users: make(map[string]*domainAuth.User)}
	svc := auth.NewService(repo, bcrypt, tokenSvc)

	seedUser(t, repo, bcrypt, "operator", "operator-pass", domainAuth.RoleDataEntryOperator, false)

	if _, err := svc.Login("operator", "operator-pass"); err == nil || err.Error() != "account is disabled" {
		t.Fatalf("expected account disabled error, got %v", err)
	}
}

func TestService_UserManagementGuards(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{users: make(map[string]*domainAuth.User)}
	svc := auth.NewService(repo, bcrypt, tokenSvc)

	seedUser(t, repo, bcrypt, "admin1", "admin-pass-1", domainAuth.RoleAdmin, true)
	seedUser(t, repo, bcrypt, "admin2", "admin-pass-2", domainAuth.RoleAdmin, true)
	seedUser(t, repo, bcrypt, "operator1", "operator-pass", domainAuth.RoleDataEntryOperator, true)

	admin1Token, err := tokenSvc.GenerateToken(&domainAuth.User{Username: "admin1", Role: domainAuth.RoleAdmin})
	if err != nil {
		t.Fatalf("failed to create admin token: %v", err)
	}

	if err := svc.SetUserActive(admin1Token.Token, "admin1", false); err == nil || err.Error() != "cannot disable your own account" {
		t.Fatalf("expected self-disable guard, got %v", err)
	}

	if err := svc.DeleteUser(admin1Token.Token, "admin1"); err == nil || err.Error() != "cannot delete your own account" {
		t.Fatalf("expected self-delete guard, got %v", err)
	}

	if err := svc.SetUserActive(admin1Token.Token, "admin2", false); err != nil {
		t.Fatalf("expected disable second admin success, got %v", err)
	}

	err = svc.UpdateUserRole(admin1Token.Token, "admin1", domainAuth.RoleDataEntryOperator)
	if err == nil || err.Error() != "forbidden: role changes are disabled" {
		t.Fatalf("expected role-change disabled guard, got %v", err)
	}

	if err := svc.SetUserActive(admin1Token.Token, "admin2", true); err != nil {
		t.Fatalf("expected re-enable second admin success, got %v", err)
	}

	if err := svc.DeleteUser(admin1Token.Token, "admin2"); err != nil {
		t.Fatalf("expected delete second admin success, got %v", err)
	}

	operatorToken, err := tokenSvc.GenerateToken(&domainAuth.User{Username: "operator1", Role: domainAuth.RoleDataEntryOperator})
	if err != nil {
		t.Fatalf("failed to create operator token: %v", err)
	}
	if _, err := svc.ListUsers(operatorToken.Token); err == nil {
		t.Fatalf("expected forbidden list-users for non-admin")
	}
}

func TestService_CurrentUserRejectsRevokedSessionAfterAccountUpdate(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{users: make(map[string]*domainAuth.User)}
	svc := auth.NewService(repo, bcrypt, tokenSvc)

	seedUser(t, repo, bcrypt, "admin1", "admin-pass-1", domainAuth.RoleAdmin, true)

	adminToken, err := tokenSvc.GenerateToken(&domainAuth.User{Username: "admin1", Role: domainAuth.RoleAdmin})
	if err != nil {
		t.Fatalf("failed to create admin token: %v", err)
	}

	// Simulate any account mutation that should revoke existing tokens immediately.
	user := repo.users["admin1"]
	user.UpdatedAt = time.Now().Add(2 * time.Minute)

	if _, err := svc.CurrentUser(adminToken.Token); err == nil || !strings.Contains(err.Error(), "session has been revoked") {
		t.Fatalf("expected revoked-session error, got %v", err)
	}
}

func TestService_CurrentUserRejectsDeletedAccount(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{users: make(map[string]*domainAuth.User)}
	svc := auth.NewService(repo, bcrypt, tokenSvc)

	seedUser(t, repo, bcrypt, "admin1", "admin-pass-1", domainAuth.RoleAdmin, true)

	adminToken, err := tokenSvc.GenerateToken(&domainAuth.User{Username: "admin1", Role: domainAuth.RoleAdmin})
	if err != nil {
		t.Fatalf("failed to create admin token: %v", err)
	}

	delete(repo.users, "admin1")

	if _, err := svc.CurrentUser(adminToken.Token); err == nil || !strings.Contains(err.Error(), "user account not found") {
		t.Fatalf("expected missing-account error, got %v", err)
	}
}

func TestService_ResetPassword(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{users: make(map[string]*domainAuth.User)}
	svc := auth.NewService(repo, bcrypt, tokenSvc)

	seedUser(t, repo, bcrypt, "admin1", "admin-pass-1", domainAuth.RoleAdmin, true)
	seedUser(t, repo, bcrypt, "operator1", "operator-pass", domainAuth.RoleDataEntryOperator, true)

	adminToken, err := tokenSvc.GenerateToken(&domainAuth.User{Username: "admin1", Role: domainAuth.RoleAdmin})
	if err != nil {
		t.Fatalf("failed to create admin token: %v", err)
	}

	if err := svc.ResetUserPassword(adminToken.Token, "operator1", "new-secret-pass"); err != nil {
		t.Fatalf("expected password reset success, got %v", err)
	}

	if _, err := svc.Login("operator1", "operator-pass"); err == nil {
		t.Fatalf("expected old password to be rejected")
	}

	if _, err := svc.Login("operator1", "new-secret-pass"); err != nil {
		t.Fatalf("expected login with reset password to succeed, got %v", err)
	}
}
