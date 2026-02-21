package license

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"
)

// LicensingService handles the overall license validation flow
type LicensingService struct {
	hwProvider    HardwareProvider
	publicKey     string
	licensePath   string
	heartbeatPath string
	clockNow      func() time.Time
	heartbeatOnce sync.Once
}

// NewLicensingService creates a new instance of LicensingService
func NewLicensingService(publicKey, licensePath, heartbeatPath string) *LicensingService {
	return &LicensingService{
		hwProvider:    NewHardwareProvider(),
		publicKey:     publicKey,
		licensePath:   licensePath,
		heartbeatPath: heartbeatPath,
		clockNow:      time.Now,
	}
}

// ValidateLicense performs the full validation suite: hardware ID, cryptographic signature, and clock check
func (s *LicensingService) ValidateLicense() error {
	status, err := s.GetCurrentStatus()
	if err != nil {
		return err
	}

	if status.Status == StatusExpired {
		return fmt.Errorf("%w: grace period ended", ErrLicenseExpired)
	}

	s.heartbeatOnce.Do(func() {
		go s.startHeartbeatUpdater()
	})

	return nil
}

func (s *LicensingService) GetCurrentStatus() (StatusSnapshot, error) {
	snapshot := StatusSnapshot{Status: StatusActive}

	// 1. Hardware ID Extraction
	hwID, err := GetHardwareID(s.hwProvider)
	if err != nil {
		return snapshot, fmt.Errorf("hardware identification failed: %w", err)
	}
	snapshot.HardwareID = hwID

	// 2. Clock Tampering Check
	err = checkClockTamperingWithNow(s.heartbeatPath, s.clockNow)
	if err != nil {
		return snapshot, err
	}

	// 3. Cryptographic Validation
	licenseKey, err := os.ReadFile(s.licensePath)
	if err != nil {
		return snapshot, fmt.Errorf("failed to read license file (%s): %w", s.licensePath, err)
	}

	signature, expiresAt, err := parseLicenseContent(string(licenseKey))
	if err != nil {
		return snapshot, err
	}

	err = VerifyLicense(s.publicKey, signature, hwID)
	if err != nil {
		if errors.Is(err, ErrHardwareIDMismatch) || strings.Contains(strings.ToLower(err.Error()), "hardware") {
			return snapshot, &HardwareMismatchError{
				HardwareID: hwID,
				Cause:      err,
			}
		}
		return snapshot, err
	}

	snapshot.ExpiresAt = ""
	if expiresAt != nil {
		snapshot.ExpiresAt = expiresAt.Format("2006-01-02")
	}
	snapshot.Status, snapshot.DaysRemaining = calculateStatus(s.clockNow(), expiresAt)

	log.Println("License validated successfully")

	return snapshot, nil
}

func (s *LicensingService) startHeartbeatUpdater() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		if err := updateHeartbeatWithNow(s.heartbeatPath, s.clockNow); err != nil {
			log.Printf("Warning: failed to update license heartbeat: %v", err)
		}
	}
}
