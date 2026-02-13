package db

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"masala_inventory_managment/internal/domain/auth"

	"github.com/google/uuid"
)

// SqliteUserRepository implements auth.UserRepository for SQLite.
type SqliteUserRepository struct {
	db *sql.DB
}

// NewSqliteUserRepository creates a new SqliteUserRepository.
func NewSqliteUserRepository(db *sql.DB) *SqliteUserRepository {
	return &SqliteUserRepository{db: db}
}

// Save persists a user to the database.
func (r *SqliteUserRepository) Save(user *auth.User) error {
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now()
	}

	query := `INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(context.Background(), query, user.ID, user.Username, user.PasswordHash, user.Role, user.CreatedAt)
	return err
}

// FindByUsername retrieves a user by their username.
func (r *SqliteUserRepository) FindByUsername(username string) (*auth.User, error) {
	query := `SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?`
	row := r.db.QueryRowContext(context.Background(), query, username)

	var user auth.User
	var roleStr string
	err := row.Scan(&user.ID, &user.Username, &user.PasswordHash, &roleStr, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // Return nil if user not found, let service handle it
		}
		return nil, err
	}
	user.Role = auth.Role(roleStr)
	return &user, nil
}

// Count returns the total number of users in the database.
func (r *SqliteUserRepository) Count() (int, error) {
	query := `SELECT COUNT(*) FROM users`
	var count int
	err := r.db.QueryRowContext(context.Background(), query).Scan(&count)
	return count, err
}
