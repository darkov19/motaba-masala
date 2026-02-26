package auth

// AuthToken represents a generated authentication token (e.g., JWT).
type AuthToken struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
}

// AuthService defines the business logic including authentication and user management.
type AuthService interface {
	Login(username, password string) (*AuthToken, error)
	CreateUser(token, username, password string, role Role) error
	ListUsers(token string) ([]User, error)
	SetUserActive(token, username string, isActive bool) error
	UpdateUserRole(token, username string, role Role) error
	ResetUserPassword(token, username, newPassword string) error
	DeleteUser(token, username string) error
}
