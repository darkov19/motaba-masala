package db

import (
	"embed"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

// Migrator handles database schema migrations
type Migrator struct {
	manager *DatabaseManager
}

// NewMigrator creates a new instance of Migrator
func NewMigrator(manager *DatabaseManager) *Migrator {
	return &Migrator{
		manager: manager,
	}
}

// RunMigrations applies all pending migrations from the embedded file system
func (m *Migrator) RunMigrations(fs embed.FS, directory string) error {
	sourceDriver, err := iofs.New(fs, directory)
	if err != nil {
		return fmt.Errorf("failed to create source driver: %w", err)
	}

	dbDriver, err := sqlite3.WithInstance(m.manager.GetDB(), &sqlite3.Config{})
	if err != nil {
		return fmt.Errorf("failed to create database driver: %w", err)
	}

	migrations, err := migrate.NewWithInstance(
		"iofs", sourceDriver,
		"sqlite3", dbDriver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	// Apply migrations
	if err := migrations.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to apply migrations: %w", err)
	}

	log.Println("Migrations applied successfully or no changes needed")
	return nil
}
