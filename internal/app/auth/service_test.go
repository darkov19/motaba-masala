package auth_test

import (
	"testing"

	"masala_inventory_managment/internal/app/auth"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	infraAuth "masala_inventory_managment/internal/infrastructure/auth"
)

type mockUserRepo struct {
	users map[string]*domainAuth.User
}

func (m *mockUserRepo) Save(user *domainAuth.User) error {
	m.users[user.Username] = user
	return nil
}

func (m *mockUserRepo) FindByUsername(username string) (*domainAuth.User, error) {
	return m.users[username], nil
}

func (m *mockUserRepo) Count() (int, error) {
	return len(m.users), nil
}

func TestService_CreateUser_Security(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{users: make(map[string]*domainAuth.User)}
	svc := auth.NewService(repo, bcrypt, tokenSvc)

	// 1. Bootstrap Case: No users exist. Should allow creation without token.
	err := svc.CreateUser("", "admin1", "pass1", domainAuth.RoleAdmin)
	if err != nil {
		t.Errorf("Bootstrap: Expected no error for first user, got %v", err)
	}

	// 2. Unauthorized Case: Users exist, no token provided.
	err = svc.CreateUser("", "user2", "pass2", domainAuth.RoleDataEntryOperator)
	if err == nil {
		t.Error("Expected error for unauthorized user creation (no token), got nil")
	}

	// 3. Forbidden Case: Users exist, DataEntryOperator user token provided.
	deoUser := &domainAuth.User{Username: "operator", Role: domainAuth.RoleDataEntryOperator}
	deoToken, _ := tokenSvc.GenerateToken(deoUser)
	err = svc.CreateUser(deoToken.Token, "user3", "pass3", domainAuth.RoleDataEntryOperator)
	if err == nil {
		t.Error("Expected error for DataEntryOperator user trying to create others, got nil")
	}

	// 4. Success Case: Admin user token provided.
	adminUser := &domainAuth.User{Username: "admin1", Role: domainAuth.RoleAdmin}
	adminToken, _ := tokenSvc.GenerateToken(adminUser)
	err = svc.CreateUser(adminToken.Token, "user4", "pass4", domainAuth.RoleDataEntryOperator)
	if err != nil {
		t.Errorf("Admin: Expected no error for user creation, got %v", err)
	}
}
