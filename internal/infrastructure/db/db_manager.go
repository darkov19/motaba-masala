package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

// DatabaseManager handles the SQLite database connection and migrations
type DatabaseManager struct {
	db     *sql.DB
	dbPath string
}

// NewDatabaseManager creates a new instance of DatabaseManager
func NewDatabaseManager(dbPath string) *DatabaseManager {
	return &DatabaseManager{
		dbPath: dbPath,
	}
}

// Connect establishes a connection to the SQLite database and configures it
func (m *DatabaseManager) Connect() error {
	// Ensure the directory exists
	dir := filepath.Dir(m.dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create database directory: %w", err)
	}

	// Open connection
	db, err := sql.Open("sqlite3", m.dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Configure SQLite
	if err := m.configure(db); err != nil {
		db.Close()
		return err
	}

	m.db = db
	log.Printf("Connected to database at %s", m.dbPath)
	return nil
}

// SetPragmas applies custom SQLite PRAGMAs to the database
func (m *DatabaseManager) SetPragmas(pragmas []string) error {
	if m.db == nil {
		return fmt.Errorf("database not connected")
	}
	for _, pragma := range pragmas {
		if _, err := m.db.Exec(pragma); err != nil {
			return fmt.Errorf("failed to apply pragma %s: %w", pragma, err)
		}
	}
	return nil
}

// DefaultPragmas returns the recommended PRAGMAs for performance and reliability
func (m *DatabaseManager) DefaultPragmas() []string {
	return []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA foreign_keys=ON;",
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA busy_timeout=5000;",
	}
}

// configure applies default PRAGMAs
func (m *DatabaseManager) configure(db *sql.DB) error {
	// Temporarily set db fields so SetPragmas can work if needed,
	// but here we just iterate directly for the initial connection
	m.db = db
	return m.SetPragmas(m.DefaultPragmas())
}

// GetDB returns the underlying sql.DB instance
func (m *DatabaseManager) GetDB() *sql.DB {
	return m.db
}

// GetDBPath returns the file path to the SQLite database
func (m *DatabaseManager) GetDBPath() string {
	return m.dbPath
}

// Close closes the database connection
func (m *DatabaseManager) Close() error {
	if m.db != nil {
		return m.db.Close()
	}
	return nil
}
