package license

import (
	"fmt"
	"log"
	"os"
	"time"
)

// LicensingService handles the overall license validation flow
type LicensingService struct {
	hwProvider    HardwareProvider
	publicKey     string
	licensePath   string
	heartbeatPath string
}

// NewLicensingService creates a new instance of LicensingService
func NewLicensingService(publicKey, licensePath, heartbeatPath string) *LicensingService {
	return &LicensingService{
		hwProvider:    NewHardwareProvider(),
		publicKey:     publicKey,
		licensePath:   licensePath,
		heartbeatPath: heartbeatPath,
	}
}

// ValidateLicense performs the full validation suite: hardware ID, cryptographic signature, and clock check
func (s *LicensingService) ValidateLicense() error {
	// 1. Hardware ID Extraction
	hwID, err := GetHardwareID(s.hwProvider)
	if err != nil {
		return fmt.Errorf("hardware identification failed: %w", err)
	}

	// 2. Clock Tampering Check
	err = CheckClockTampering(s.heartbeatPath)
	if err != nil {
		return err
	}

	// 3. Cryptographic Validation
	licenseKey, err := os.ReadFile(s.licensePath)
	if err != nil {
		return fmt.Errorf("failed to read license file (%s): %w", s.licensePath, err)
	}

	err = VerifyLicense(s.publicKey, string(licenseKey), hwID)
	if err != nil {
		return err
	}

	log.Println("License validated successfully")

	// Start background heartbeat update
	go s.startHeartbeatUpdater()

	return nil
}

func (s *LicensingService) startHeartbeatUpdater() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		if err := UpdateHeartbeat(s.heartbeatPath); err != nil {
			log.Printf("Warning: failed to update license heartbeat: %v", err)
		}
	}
}
