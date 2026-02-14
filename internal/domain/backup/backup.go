package backup

import "time"

// BackupConfig defines configuration for the backup service
type BackupConfig struct {
	BackupPath    string
	RetentionDays int
	ScheduleCron  string // e.g., "0 2 * * *"
}

// BackupStatus represents the state of the last backup operation
type BackupStatus struct {
	LastBackupTime time.Time
	FilePath       string
	Size           int64
	Success        bool
	Message        string
	IsRunning      bool
}
