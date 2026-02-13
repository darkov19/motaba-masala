package auth

import (
	"errors"
	"time"

	"masala_inventory_managment/internal/domain/auth"

	"github.com/golang-jwt/jwt/v5"
)

// TokenService handles generation and validation of JWT tokens.
type TokenService struct {
	secretKey []byte
}

// NewTokenService creates a new TokenService with the provided secret key.
func NewTokenService(secretKey string) *TokenService {
	return &TokenService{
		secretKey: []byte(secretKey),
	}
}

// CustomClaims extends jwt.RegisteredClaims to include role information.
type CustomClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken generates a signed JWT for the user.
func (s *TokenService) GenerateToken(user *auth.User) (*auth.AuthToken, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token valid for 24 hours
	claims := &CustomClaims{
		Role: string(user.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.Username,
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.secretKey)
	if err != nil {
		return nil, err
	}

	return &auth.AuthToken{
		Token:     tokenString,
		ExpiresAt: expirationTime.Unix(),
	}, nil
}

// ValidateToken validates the token and returns the claims if valid.
func (s *TokenService) ValidateToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.secretKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
