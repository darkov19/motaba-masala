package auth

import (
	"errors"
	"fmt"

	appSys "masala_inventory_managment/internal/app/system"
	domainAuth "masala_inventory_managment/internal/domain/auth"
)

// AuthInterceptor checks if the user has the required role.
// This is a placeholder for Wails middleware or manual checks in service methods.
// type AuthInterceptor struct {
// 	tokenService *infraAuth.TokenService
// }

// CheckPermission validates the token and checks if the user has the required role.
func (s *Service) CheckPermission(tokenString string, requiredRole domainAuth.Role) error {
	if err := appSys.RequireNormalMode(); err != nil {
		return err
	}

	claims, err := s.tokenService.ValidateToken(tokenString)
	if err != nil {
		return fmt.Errorf("unauthorized: %w", err)
	}

	if requiredRole == "" {
		return nil // No specific role required, just valid token
	}

	// Role Hierarchy: Admin > DataEntryOperator
	roles := map[domainAuth.Role]int{
		domainAuth.RoleAdmin:             2,
		domainAuth.RoleDataEntryOperator: 1,
	}

	userRole := domainAuth.Role(claims.Role)
	if roles[userRole] >= roles[requiredRole] {
		return nil
	}

	return errors.New("forbidden: insufficient permissions")
}

// CurrentUser retrieves the current user from the token.
func (s *Service) CurrentUser(tokenString string) (*domainAuth.User, error) {
	claims, err := s.tokenService.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}
	// In a real app, we might fetch from DB to ensure user still exists/active
	// For now, return basic info from claims
	return &domainAuth.User{
		Username: claims.Subject,
		Role:     domainAuth.Role(claims.Role),
	}, nil
}
