package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	domainAuth "masala_inventory_managment/internal/domain/auth"
	infraAuth "masala_inventory_managment/internal/infrastructure/auth"
)

// Service is the application service implementation for Auth.
type Service struct {
	userRepo      domainAuth.UserRepository
	bcryptService *infraAuth.BcryptService
	tokenService  *infraAuth.TokenService
}

const (
	ErrLastActiveAdmin = "cannot modify the last active admin"
)

// NewService creates a new AuthService.
func NewService(repo domainAuth.UserRepository, bcrypt *infraAuth.BcryptService, token *infraAuth.TokenService) *Service {
	return &Service{
		userRepo:      repo,
		bcryptService: bcrypt,
		tokenService:  token,
	}
}

// Login authenticates a user and returns a token.
func (s *Service) Login(username, password string) (*domainAuth.AuthToken, error) {
	normalizedUsername := strings.TrimSpace(username)
	if normalizedUsername == "" {
		slog.Warn("Auth login rejected", "reason", "empty-username")
		return nil, errors.New("invalid credentials")
	}

	user, err := s.userRepo.FindByUsername(normalizedUsername)
	if err != nil {
		slog.Error("Auth login lookup failed", "username", normalizedUsername, "error", err)
		return nil, fmt.Errorf("failed to find user: %w", err)
	}
	if user == nil {
		slog.Warn("Auth login failed", "username", normalizedUsername, "reason", "user-not-found")
		return nil, errors.New("invalid credentials")
	}
	if !user.IsActive {
		slog.Warn("Auth login rejected", "username", normalizedUsername, "reason", "inactive-account")
		return nil, errors.New("account is disabled")
	}

	err = s.bcryptService.CheckPasswordHash(password, user.PasswordHash)
	if err != nil {
		slog.Warn("Auth login failed", "username", normalizedUsername, "reason", "password-mismatch")
		return nil, errors.New("invalid credentials")
	}

	token, err := s.tokenService.GenerateToken(user)
	if err != nil {
		slog.Error("Auth login token generation failed", "username", normalizedUsername, "error", err)
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	slog.Info("Auth login succeeded", "username", normalizedUsername, "role", user.Role)
	return token, nil
}

// CreateUser registers a new user. It is restricted to Admin users unless no users exist (bootstrap).
func (s *Service) CreateUser(token, username, password string, role domainAuth.Role) error {
	normalizedUsername := strings.TrimSpace(username)
	if normalizedUsername == "" {
		return errors.New("username is required")
	}
	if err := validateManagedRole(role); err != nil {
		return err
	}

	// Bootstrap Logic: Check if any users exist
	count, err := s.userRepo.Count()
	if err != nil {
		return fmt.Errorf("failed to count users: %w", err)
	}

	// If users exist, enforce permission check
	if count > 0 {
		if err := s.CheckPermission(token, domainAuth.RoleAdmin); err != nil {
			return err
		}
	}

	existingUser, err := s.userRepo.FindByUsername(normalizedUsername)
	if err != nil {
		return fmt.Errorf("lookup failed: %w", err)
	}
	if existingUser != nil {
		return errors.New("username already exists")
	}

	hashedPassword, err := s.bcryptService.HashPassword(password)
	if err != nil {
		return fmt.Errorf("hashing failed: %w", err)
	}

	newUser := domainAuth.NewUser(normalizedUsername, hashedPassword, role)
	if err := s.userRepo.Save(newUser); err != nil {
		return fmt.Errorf("save failed: %w", err)
	}
	return nil
}

func (s *Service) ListUsers(token string) ([]domainAuth.User, error) {
	if err := s.CheckPermission(token, domainAuth.RoleAdmin); err != nil {
		return nil, err
	}
	users, err := s.userRepo.List()
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	return users, nil
}

func (s *Service) SetUserActive(token, username string, isActive bool) error {
	actor, err := s.CurrentUser(token)
	if err != nil {
		return err
	}
	if actor.Role != domainAuth.RoleAdmin {
		return errors.New("forbidden: insufficient permissions")
	}

	targetUsername := strings.TrimSpace(username)
	if targetUsername == "" {
		return errors.New("username is required")
	}
	if strings.EqualFold(actor.Username, targetUsername) && !isActive {
		return errors.New("cannot disable your own account")
	}

	target, err := s.userRepo.FindByUsername(targetUsername)
	if err != nil {
		return fmt.Errorf("lookup failed: %w", err)
	}
	if target == nil {
		return errors.New("user not found")
	}

	if !isActive && target.Role == domainAuth.RoleAdmin && target.IsActive {
		if err := s.ensureAnotherActiveAdminExists(); err != nil {
			return err
		}
	}

	if err := s.userRepo.SetActive(targetUsername, isActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("user not found")
		}
		return fmt.Errorf("failed to update user active state: %w", err)
	}
	return nil
}

func (s *Service) UpdateUserRole(token, username string, role domainAuth.Role) error {
	return errors.New("forbidden: role changes are disabled")
}

func (s *Service) ResetUserPassword(token, username, newPassword string) error {
	actor, err := s.CurrentUser(token)
	if err != nil {
		return err
	}
	if actor.Role != domainAuth.RoleAdmin {
		return errors.New("forbidden: insufficient permissions")
	}

	targetUsername := strings.TrimSpace(username)
	if targetUsername == "" {
		return errors.New("username is required")
	}

	target, err := s.userRepo.FindByUsername(targetUsername)
	if err != nil {
		return fmt.Errorf("lookup failed: %w", err)
	}
	if target == nil {
		return errors.New("user not found")
	}

	hashedPassword, err := s.bcryptService.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("hashing failed: %w", err)
	}
	if err := s.userRepo.UpdatePasswordHash(targetUsername, hashedPassword); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("user not found")
		}
		return fmt.Errorf("failed to update password: %w", err)
	}
	return nil
}

func (s *Service) DeleteUser(token, username string) error {
	actor, err := s.CurrentUser(token)
	if err != nil {
		return err
	}
	if actor.Role != domainAuth.RoleAdmin {
		return errors.New("forbidden: insufficient permissions")
	}

	targetUsername := strings.TrimSpace(username)
	if targetUsername == "" {
		return errors.New("username is required")
	}
	if strings.EqualFold(actor.Username, targetUsername) {
		return errors.New("cannot delete your own account")
	}

	target, err := s.userRepo.FindByUsername(targetUsername)
	if err != nil {
		return fmt.Errorf("lookup failed: %w", err)
	}
	if target == nil {
		return errors.New("user not found")
	}
	if target.Role == domainAuth.RoleAdmin && target.IsActive {
		if err := s.ensureAnotherActiveAdminExists(); err != nil {
			return err
		}
	}

	if err := s.userRepo.DeleteByUsername(targetUsername); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("user not found")
		}
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

func (s *Service) ensureAnotherActiveAdminExists() error {
	activeAdmins, err := s.userRepo.CountActiveAdmins()
	if err != nil {
		return fmt.Errorf("failed to count active admins: %w", err)
	}
	if activeAdmins <= 1 {
		return errors.New(ErrLastActiveAdmin)
	}
	return nil
}

func validateManagedRole(role domainAuth.Role) error {
	switch role {
	case domainAuth.RoleAdmin, domainAuth.RoleDataEntryOperator:
		return nil
	default:
		return fmt.Errorf("invalid role: %s", role)
	}
}
