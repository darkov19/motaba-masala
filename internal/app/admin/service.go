package admin

import (
	appAuth "masala_inventory_managment/internal/app/auth"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	"masala_inventory_managment/internal/domain/backup"
	"masala_inventory_managment/internal/infrastructure/license"
)

// SystemStatus aggregates status information from various subsystems
type SystemStatus struct {
	LicenseValid bool                 `json:"license_valid"`
	LicenseError string               `json:"license_error,omitempty"`
	Backup       *backup.BackupStatus `json:"backup_status"`
}

// Service provides admin-level application logic
type Service struct {
	authService    *appAuth.Service
	backupService  backup.BackupService
	licenseService *license.LicensingService
	logError       func(string, ...interface{})
}

// NewService creates a new admin application service
func NewService(auth *appAuth.Service, backup backup.BackupService, lic *license.LicensingService, logError func(string, ...interface{})) *Service {
	return &Service{
		authService:    auth,
		backupService:  backup,
		licenseService: lic,
		logError:       logError,
	}
}

// GetSystemStatus returns the system status including license and backup info.
// Restricted to Admin role.
func (s *Service) GetSystemStatus(token string) (*SystemStatus, error) {
	if err := s.authService.CheckPermission(token, domainAuth.RoleAdmin); err != nil {
		return nil, err
	}

	licErr := s.licenseService.ValidateLicense()

	// Get backup status. If it fails, we return nil status but don't fail the whole request
	backupStatus, _ := s.backupService.GetStatus()

	return &SystemStatus{
		LicenseValid: licErr == nil,
		LicenseError: func() string {
			if licErr != nil {
				return licErr.Error()
			}
			return ""
		}(),
		Backup: backupStatus,
	}, nil
}

// TriggerBackup initiates a manual backup.
// Restricted to Admin role.
func (s *Service) TriggerBackup(token string) error {
	if err := s.authService.CheckPermission(token, domainAuth.RoleAdmin); err != nil {
		return err
	}

	// Trigger backup in background
	// Error is logged rather than returned since the goroutine is fire-and-forget
	go func() {
		if err := s.backupService.Execute(); err != nil {
			s.logError("Manual backup trigger failed: %v", err)
		}
	}()

	return nil
}
