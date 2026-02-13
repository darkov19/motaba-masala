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
}
