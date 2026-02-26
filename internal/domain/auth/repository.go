package auth

// UserRepository defines the persistence interface for users.
type UserRepository interface {
	Save(user *User) error
	FindByUsername(username string) (*User, error)
	Count() (int, error)
	List() ([]User, error)
	UpdateRole(username string, role Role) error
	SetActive(username string, isActive bool) error
	UpdatePasswordHash(username, passwordHash string) error
	DeleteByUsername(username string) error
	CountActiveAdmins() (int, error)
}
