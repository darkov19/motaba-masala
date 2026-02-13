package auth

import (
	"errors"
	"fmt"

	domainAuth "masala_inventory_managment/internal/domain/auth"
	infraAuth "masala_inventory_managment/internal/infrastructure/auth"
)

// Service is the application service implementation for Auth.
type Service struct {
	userRepo      domainAuth.UserRepository
	bcryptService *infraAuth.BcryptService
	tokenService  *infraAuth.TokenService
}

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
	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}
	if user == nil {
		return nil, errors.New("invalid credentials")
	}

	err = s.bcryptService.CheckPasswordHash(password, user.PasswordHash)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	token, err := s.tokenService.GenerateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, nil
}

// CreateUser registers a new user. It is restricted to Admin users unless no users exist (bootstrap).
func (s *Service) CreateUser(token, username, password string, role domainAuth.Role) error {
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

	existingUser, err := s.userRepo.FindByUsername(username)
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

	newUser := domainAuth.NewUser(username, hashedPassword, role)
	if err := s.userRepo.Save(newUser); err != nil {
		return fmt.Errorf("save failed: %w", err)
	}
	return nil
}
