package auth

import (
	"errors"
	"fmt"
	"strings"
	"time"

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

	user, err := s.CurrentUser(tokenString)
	if err != nil {
		return err
	}

	if requiredRole == "" {
		return nil // No specific role required, just valid token
	}

	// Role Hierarchy: Admin > DataEntryOperator
	roles := map[domainAuth.Role]int{
		domainAuth.RoleAdmin:             2,
		domainAuth.RoleDataEntryOperator: 1,
	}

	if roles[user.Role] >= roles[requiredRole] {
		return nil
	}

	return errors.New("forbidden: insufficient permissions")
}

// CurrentUser retrieves the current user from the token.
func (s *Service) CurrentUser(tokenString string) (*domainAuth.User, error) {
	claims, err := s.tokenService.ValidateToken(tokenString)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: %w", err)
	}

	username := strings.TrimSpace(claims.Subject)
	if username == "" {
		return nil, errors.New("unauthorized: token subject is missing")
	}

	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: failed to load user: %w", err)
	}
	if user == nil {
		return nil, errors.New("unauthorized: user account not found")
	}
	if !user.IsActive {
		return nil, errors.New("forbidden: account is disabled")
	}

	if claims.UserVersion > 0 {
		if user.UpdatedAt.UTC().UnixNano() > claims.UserVersion {
			return nil, errors.New("unauthorized: session has been revoked; please sign in again")
		}
	} else if claims.IssuedAt != nil {
		issuedAt := claims.IssuedAt.Time.UTC().Truncate(time.Second)
		updatedAt := user.UpdatedAt.UTC().Truncate(time.Second)
		if updatedAt.After(issuedAt) {
			return nil, errors.New("unauthorized: session has been revoked; please sign in again")
		}
	}

	return user, nil
}
