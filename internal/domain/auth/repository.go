package auth

// UserRepository defines the persistence interface for users.
type UserRepository interface {
	Save(user *User) error
	FindByUsername(username string) (*User, error)
	Count() (int, error)
	// Add other methods as needed, e.g., List, Delete
}
