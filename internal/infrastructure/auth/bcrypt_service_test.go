package auth_test

import (
	"testing"

	"masala_inventory_managment/internal/infrastructure/auth"
)

func TestBcryptService_HashAndCheck(t *testing.T) {
	service := auth.NewBcryptService()
	password := "securepassword"

	hash, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if hash == password {
		t.Error("Hash should not match plain password")
	}

	err = service.CheckPasswordHash(password, hash)
	if err != nil {
		t.Errorf("Failed to verify correct password: %v", err)
	}

	err = service.CheckPasswordHash("wrongpassword", hash)
	if err == nil {
		t.Error("Verification should fail for wrong password")
	}
}
