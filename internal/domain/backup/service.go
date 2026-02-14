package backup

// BackupService defines the interface for backup operations
type BackupService interface {
	// Execute performs an immediate backup
	Execute() error

	// GetStatus returns the status of the last backup
	GetStatus() (*BackupStatus, error)

	// StartScheduler starts the backup scheduler
	StartScheduler() error

	// StopScheduler stops the backup scheduler
	StopScheduler() error

	// Prune removes old backups based on retention policy
	// Returns the number of files pruned and any error
	Prune() (int, error)
}
