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
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = user.CreatedAt
	}

	query := `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(context.Background(), query, user.ID, user.Username, user.PasswordHash, user.Role, user.IsActive, user.CreatedAt, user.UpdatedAt)
	return err
}

// FindByUsername retrieves a user by their username.
func (r *SqliteUserRepository) FindByUsername(username string) (*auth.User, error) {
	query := `SELECT id, username, password_hash, role, is_active, created_at, updated_at FROM users WHERE username = ?`
	row := r.db.QueryRowContext(context.Background(), query, username)

	var user auth.User
	var roleStr string
	err := row.Scan(&user.ID, &user.Username, &user.PasswordHash, &roleStr, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
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

func (r *SqliteUserRepository) List() ([]auth.User, error) {
	query := `SELECT id, username, password_hash, role, is_active, created_at, updated_at FROM users ORDER BY created_at ASC`
	rows, err := r.db.QueryContext(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]auth.User, 0)
	for rows.Next() {
		var user auth.User
		var roleStr string
		if scanErr := rows.Scan(&user.ID, &user.Username, &user.PasswordHash, &roleStr, &user.IsActive, &user.CreatedAt, &user.UpdatedAt); scanErr != nil {
			return nil, scanErr
		}
		user.Role = auth.Role(roleStr)
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func (r *SqliteUserRepository) UpdateRole(username string, role auth.Role) error {
	query := `UPDATE users SET role = ?, updated_at = ? WHERE username = ?`
	result, err := r.db.ExecContext(context.Background(), query, role, time.Now(), username)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *SqliteUserRepository) SetActive(username string, isActive bool) error {
	query := `UPDATE users SET is_active = ?, updated_at = ? WHERE username = ?`
	result, err := r.db.ExecContext(context.Background(), query, isActive, time.Now(), username)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *SqliteUserRepository) UpdatePasswordHash(username, passwordHash string) error {
	query := `UPDATE users SET password_hash = ?, updated_at = ? WHERE username = ?`
	result, err := r.db.ExecContext(context.Background(), query, passwordHash, time.Now(), username)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *SqliteUserRepository) DeleteByUsername(username string) error {
	query := `DELETE FROM users WHERE username = ?`
	result, err := r.db.ExecContext(context.Background(), query, username)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *SqliteUserRepository) CountActiveAdmins() (int, error) {
	query := `SELECT COUNT(*) FROM users WHERE role = ? AND is_active = TRUE`
	var count int
	err := r.db.QueryRowContext(context.Background(), query, auth.RoleAdmin).Scan(&count)
	return count, err
}
