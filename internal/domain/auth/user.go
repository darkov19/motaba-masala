package auth

import "time"

// Role represents the role of a user in the system.
type Role string

const (
	RoleAdmin             Role = "Admin"
	RoleDataEntryOperator Role = "DataEntryOperator"
)

// User represents a system user.
type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"` // Never expose password hash in JSON
	Role         Role      `json:"role"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// NewUser creates a new user instance.
func NewUser(username, passwordHash string, role Role) *User {
	now := time.Now()
	return &User{
		Username:     username,
		PasswordHash: passwordHash,
		Role:         role,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}
