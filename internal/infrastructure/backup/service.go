package backup

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"masala_inventory_managment/internal/domain/backup"
	"masala_inventory_managment/internal/infrastructure/db"
)

// Service implements backup.BackupService
type Service struct {
	dbManager        *db.DatabaseManager
	config           backup.BackupConfig
	status           backup.BackupStatus
	mu               sync.Mutex
	running          bool
	schedulerRunning bool
	stopChan         chan struct{}
	logInfo          func(string, ...interface{})
	logError         func(string, ...interface{})
}

// NewService creates a new backup service
func NewService(
	dbManager *db.DatabaseManager,
	config backup.BackupConfig,
	logInfo func(string, ...interface{}),
	logError func(string, ...interface{}),
) *Service {
	// Set defaults if missing
	if config.BackupPath == "" {
		config.BackupPath = "backups" // Default relative to CWD
	}
	if config.RetentionDays <= 0 {
		config.RetentionDays = 7
	}
	if config.ScheduleCron == "" {
		config.ScheduleCron = "0 2 * * *" // Note: we are using simple ticker for now, this is placeholder
	}

	return &Service{
		dbManager: dbManager,
		config:    config,
		stopChan:  make(chan struct{}),
		logInfo:   logInfo,
		logError:  logError,
	}
}

// Execute performs an immediate backup
// It blocks until compliance is checked or backup finishes.
// To run in background, caller should use a goroutine.
// However, to enforce non-overlapping, we use a mutex inside.
func (s *Service) Execute() error {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return fmt.Errorf("backup already in progress")
	}
	s.running = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.running = false
		s.mu.Unlock()
	}()

	s.logInfo("Starting database backup...")

	startTime := time.Now()

	// Ensure backup directory exists
	if err := os.MkdirAll(s.config.BackupPath, 0755); err != nil {
		s.recordStatus(startTime, "", 0, false, fmt.Sprintf("failed to create backup dir: %v", err))
		return err
	}

	// Generate filename
	timestamp := startTime.Format("2006-01-02T150405")
	baseName := fmt.Sprintf("backup-%s", timestamp)
	tempDbCopy := filepath.Join(s.config.BackupPath, baseName+".db")
	zipPath := filepath.Join(s.config.BackupPath, baseName+".zip")

	// 1. Create a copy of the SQLite DB
	dbPath := s.dbManager.GetDBPath()

	// Prepare for copy.
	// Prefer VACUUM INTO if supported (SQLite 3.27+), else file copy.
	// We'll try VACUUM INTO first as it is atomic and consistent even in WAL mode.
	err := s.vacuumInto(tempDbCopy)
	if err != nil {
		s.logError("VACUUM INTO failed, falling back to file copy: %v", err)
		// Fallback to manual copy with checkpoint
		if errCopy := s.copyDatabaseFile(dbPath, tempDbCopy); errCopy != nil {
			errCombined := fmt.Errorf("backup failed: VACUUM error (%v), Copy error (%v)", err, errCopy)
			s.recordStatus(startTime, "", 0, false, errCombined.Error())
			return errCombined
		}
	}

	defer os.Remove(tempDbCopy) // Cleanup temp DB file

	// 2. Zip the DB file
	if err := s.zipFile(tempDbCopy, zipPath, "masala_inventory.db"); err != nil {
		s.recordStatus(startTime, "", 0, false, fmt.Sprintf("zip failed: %v", err))
		return err
	}

	// Get file info for status
	info, err := os.Stat(zipPath)
	size := int64(0)
	if err == nil {
		size = info.Size()
	}

	// 3. Prune old backups
	prunedCount, err := s.Prune()
	if err != nil {
		s.logError("Pruning failed: %v", err)
		// Don't fail the backup itself if pruning fails
	} else {
		s.logInfo("Pruned %d old backup files", prunedCount)
	}

	s.logInfo("Backup completed successfully: %s", zipPath)
	s.recordStatus(startTime, zipPath, size, true, "Backup successful")
	return nil
}

// vacuumInto uses SQLite's VACUUM INTO command to create a backup
func (s *Service) vacuumInto(destPath string) error {
	// Destination path must be absolute for SQLite if not in CWD?
	// Actually VACUUM INTO handles paths, but robust code uses absolute.
	absDest, err := filepath.Abs(destPath)
	if err != nil {
		return err
	}

	// Escape single quotes in path just in case
	escapedPath := strings.ReplaceAll(absDest, "'", "''")

	query := fmt.Sprintf("VACUUM INTO '%s'", escapedPath)
	_, err = s.dbManager.GetDB().Exec(query)
	return err
}

// copyDatabaseFile copies the database file manually, attempting to checkpoint first
func (s *Service) copyDatabaseFile(src, dst string) error {
	// Force a checkpoint to move WAL pages to DB file
	// PRAGMA wal_checkpoint(TRUNCATE) or PASSIVE
	_, err := s.dbManager.GetDB().Exec("PRAGMA wal_checkpoint(TRUNCATE)")
	if err != nil {
		s.logError("Checkpoint failed: %v", err)
		// Proceeding anyway, but data might be slightly stale or inconsistent if heavily writing
	}

	sourceFileStat, err := os.Stat(src)
	if err != nil {
		return err
	}

	if !sourceFileStat.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file", src)
	}

	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destination.Close()

	if _, err := io.Copy(destination, source); err != nil {
		return err
	}

	return nil
}

// zipFile creates a zip archive containing the source file
func (s *Service) zipFile(srcPath, zipPath, entryName string) error {
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer zipFile.Close()

	archive := zip.NewWriter(zipFile)
	defer archive.Close()

	fileToZip, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer fileToZip.Close()

	// Add file to zip
	w, err := archive.Create(entryName)
	if err != nil {
		return err
	}

	if _, err := io.Copy(w, fileToZip); err != nil {
		return err
	}

	return nil
}

// Prune removes old backups based on retention policy
func (s *Service) Prune() (int, error) {
	files, err := os.ReadDir(s.config.BackupPath)
	if err != nil {
		return 0, err
	}

	var backups []os.DirEntry
	for _, f := range files {
		if !f.IsDir() && strings.HasPrefix(f.Name(), "backup-") && strings.HasSuffix(f.Name(), ".zip") {
			backups = append(backups, f)
		}
	}

	// Sort by name (which acts as timestamp sort due to YYYY-MM-DD format)
	// We want to KEEP the newest, delete the oldest.
	// RetentionDays = 7 means keep backups from the last 7 days.
	// Actually, "backups older than 7 days".

	threshold := time.Now().AddDate(0, 0, -s.config.RetentionDays)
	pruned := 0

	for _, f := range backups {
		// Parse timestamp from name: backup-2026-02-13T020000.zip
		name := f.Name()
		tsStr := strings.TrimSuffix(strings.TrimPrefix(name, "backup-"), ".zip")

		ts, err := time.Parse("2006-01-02T150405", tsStr)
		if err != nil {
			// Try without time if legacy format? assumed T format for now
			continue
		}

		if ts.Before(threshold) {
			path := filepath.Join(s.config.BackupPath, name)
			if err := os.Remove(path); err != nil {
				s.logError("Failed to delete old backup %s: %v", name, err)
			} else {
				pruned++
				s.logInfo("Pruned old backup: %s", name)
			}
		}
	}

	return pruned, nil
}

// GetStatus returns the status of the last backup
func (s *Service) GetStatus() (*backup.BackupStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Return a copy
	stat := s.status
	stat.IsRunning = s.running
	return &stat, nil
}

func (s *Service) recordStatus(t time.Time, path string, size int64, success bool, msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.status = backup.BackupStatus{
		LastBackupTime: t,
		FilePath:       path,
		Size:           size,
		Success:        success,
		Message:        msg,
	}
}

// StartScheduler starts the backup scheduler
func (s *Service) StartScheduler() error {
	s.mu.Lock()
	if s.schedulerRunning {
		s.mu.Unlock()
		return fmt.Errorf("scheduler already running")
	}
	s.schedulerRunning = true
	s.mu.Unlock()

	go s.runSchedule()
	s.logInfo("Backup scheduler started")
	return nil
}

func (s *Service) runSchedule() {
	// Parse schedule time from config if strictly needed, but for MVP let's target 02:00 Local
	targetHour := 2
	targetMinute := 0

	for {
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), targetHour, targetMinute, 0, 0, now.Location())

		if !nextRun.After(now) {
			nextRun = nextRun.Add(24 * time.Hour)
		}

		duration := nextRun.Sub(now)
		s.logInfo("Next scheduled backup in %v at %v", duration, nextRun)

		select {
		case <-time.After(duration):
			// Time to run
			if err := s.Execute(); err != nil {
				s.logError("Scheduled backup failed: %v", err)
			}
		case <-s.stopChan:
			s.logInfo("Scheduler stopped")
			return
		}
	}
}

// StopScheduler stops the backup scheduler gracefully
func (s *Service) StopScheduler() error {
	s.mu.Lock()
	if !s.schedulerRunning {
		s.mu.Unlock()
		return nil
	}
	s.schedulerRunning = false
	s.mu.Unlock()

	select {
	case s.stopChan <- struct{}{}:
	default:
	}
	s.logInfo("Backup scheduler stopped")
	return nil
}

// ListBackups returns available backup zip files sorted newest-first.
func (s *Service) ListBackups() ([]string, error) {
	files, err := os.ReadDir(s.config.BackupPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}

	backups := make([]string, 0)
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		if strings.HasPrefix(name, "backup-") && strings.HasSuffix(name, ".zip") {
			backups = append(backups, filepath.Join(s.config.BackupPath, name))
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(backups)))
	return backups, nil
}

// Restore extracts a backup archive and replaces the active database file.
func (s *Service) Restore(backupPath string) error {
	if backupPath == "" {
		return fmt.Errorf("backup path is required")
	}

	// Allow passing just the file name from UI.
	candidate := backupPath
	if !filepath.IsAbs(candidate) {
		candidate = filepath.Join(s.config.BackupPath, filepath.Base(candidate))
	}

	absCandidate, err := filepath.Abs(candidate)
	if err != nil {
		return err
	}
	absBackupDir, err := filepath.Abs(s.config.BackupPath)
	if err != nil {
		return err
	}
	relPath, err := filepath.Rel(absBackupDir, absCandidate)
	if err != nil {
		return err
	}
	if relPath == "." || relPath == ".." || strings.HasPrefix(relPath, ".."+string(os.PathSeparator)) || filepath.IsAbs(relPath) {
		return fmt.Errorf("backup path must be inside backup directory")
	}

	r, err := zip.OpenReader(absCandidate)
	if err != nil {
		return err
	}
	defer r.Close()

	var sourceFile *zip.File
	for _, f := range r.File {
		if filepath.Base(f.Name) == "masala_inventory.db" {
			sourceFile = f
			break
		}
	}
	if sourceFile == nil {
		return fmt.Errorf("backup does not contain masala_inventory.db")
	}

	rc, err := sourceFile.Open()
	if err != nil {
		return err
	}
	defer rc.Close()

	dbPath := s.dbManager.GetDBPath()
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return err
	}

	tmpPath := dbPath + ".restore_tmp"
	dst, err := os.Create(tmpPath)
	if err != nil {
		return err
	}
	if _, err := io.Copy(dst, rc); err != nil {
		_ = dst.Close()
		return err
	}
	if err := dst.Close(); err != nil {
		return err
	}

	_ = s.dbManager.Close()

	// Remove sidecar files from previous DB state so stale WAL/SHM cannot
	// override restored content on next connection.
	_ = os.Remove(dbPath + "-wal")
	_ = os.Remove(dbPath + "-shm")

	// On Windows, renaming over an existing file may fail; remove target first.
	if err := os.Remove(dbPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	if err := os.Rename(tmpPath, dbPath); err != nil {
		return err
	}

	// Ensure no stale sidecars remain after DB swap.
	_ = os.Remove(dbPath + "-wal")
	_ = os.Remove(dbPath + "-shm")

	return s.dbManager.Connect()
}
