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
	CreatedAt    time.Time `json:"created_at"`
}

// NewUser creates a new user instance.
func NewUser(username, passwordHash string, role Role) *User {
	return &User{
		Username:     username,
		PasswordHash: passwordHash,
		Role:         role,
		CreatedAt:    time.Now(),
	}
}
