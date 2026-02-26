package report_test

import (
	"database/sql"
	"testing"

	appAuth "masala_inventory_managment/internal/app/auth"
	appReport "masala_inventory_managment/internal/app/report"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	infraAuth "masala_inventory_managment/internal/infrastructure/auth"
)

type mockUserRepo struct {
	user *domainAuth.User
}

func (m *mockUserRepo) Save(user *domainAuth.User) error { return nil }
func (m *mockUserRepo) FindByUsername(username string) (*domainAuth.User, error) {
	return m.user, nil
}
func (m *mockUserRepo) Count() (int, error) {
	if m.user == nil {
		return 0, nil
	}
	return 1, nil
}
func (m *mockUserRepo) List() ([]domainAuth.User, error) { return nil, nil }
func (m *mockUserRepo) UpdateRole(username string, role domainAuth.Role) error {
	return sql.ErrNoRows
}
func (m *mockUserRepo) SetActive(username string, isActive bool) error {
	return sql.ErrNoRows
}
func (m *mockUserRepo) UpdatePasswordHash(username, passwordHash string) error {
	return sql.ErrNoRows
}
func (m *mockUserRepo) DeleteByUsername(username string) error { return sql.ErrNoRows }
func (m *mockUserRepo) CountActiveAdmins() (int, error)        { return 0, nil }

func TestReportService_GetValuation_Security(t *testing.T) {
	bcrypt := infraAuth.NewBcryptService()
	tokenSvc := infraAuth.NewTokenService("test-secret")
	repo := &mockUserRepo{}
	authSvc := appAuth.NewService(repo, bcrypt, tokenSvc)
	reportSvc := appReport.NewAppService(authSvc)

	// Case 1: Admin user (Access Granted)
	adminUser := &domainAuth.User{Username: "admin", Role: domainAuth.RoleAdmin}
	adminToken, _ := tokenSvc.GenerateToken(adminUser)
	_, err := reportSvc.GetValuation(adminToken.Token)
	if err != nil {
		t.Errorf("Admin should have access to valuation, got error: %v", err)
	}

	// Case 2: DataEntryOperator user (Access Denied)
	deoUser := &domainAuth.User{Username: "operator", Role: domainAuth.RoleDataEntryOperator}
	deoToken, _ := tokenSvc.GenerateToken(deoUser)
	_, err = reportSvc.GetValuation(deoToken.Token)
	if err == nil {
		t.Error("DataEntryOperator user should be denied access to valuation, but got nil error")
	}

	// Case 3: Invalid Token (Unauthorized)
	_, err = reportSvc.GetValuation("invalid-token")
	if err == nil {
		t.Error("Invalid token should be unauthorized, but got nil error")
	}
}
