package auth

import "golang.org/x/crypto/bcrypt"

// BcryptService provides methods for hashing and comparing passwords securely.
type BcryptService struct{}

// NewBcryptService creates a new instance of BcryptService.
func NewBcryptService() *BcryptService {
	return &BcryptService{}
}

// HashPassword hashes a plain-text password using bcrypt.
func (s *BcryptService) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash compares a hashed password with a plain-text password.
// Returns nil if they match, or an error if they don't.
func (s *BcryptService) CheckPasswordHash(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
