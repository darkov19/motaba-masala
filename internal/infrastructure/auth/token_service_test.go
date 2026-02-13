package auth_test

import (
	"testing"

	"masala_inventory_managment/internal/domain/auth"
	infraAuth "masala_inventory_managment/internal/infrastructure/auth"
)

func TestTokenService_GenerateAndValidate(t *testing.T) {
	secret := "test-secret"
	service := infraAuth.NewTokenService(secret)

	user := &auth.User{
		Username: "testuser",
		Role:     auth.RoleAdmin,
	}

	token, err := service.GenerateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token.Token == "" {
		t.Error("Generated token string is empty")
	}

	claims, err := service.ValidateToken(token.Token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if claims.Subject != user.Username {
		t.Errorf("Expected subject %s, got %s", user.Username, claims.Subject)
	}

	if claims.Role != string(user.Role) {
		t.Errorf("Expected role %s, got %s", user.Role, claims.Role)
	}
}

func TestTokenService_InvalidToken(t *testing.T) {
	service := infraAuth.NewTokenService("test-secret")
	_, err := service.ValidateToken("invalid.token.string")
	if err == nil {
		t.Error("Expected error for invalid token, got nil")
	}
}
