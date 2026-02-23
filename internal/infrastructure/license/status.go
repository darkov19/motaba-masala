package license

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
)

const (
	expiryWarningDays = 30
	gracePeriodDays   = 7
)

var (
	ErrHardwareIDMismatch = errors.New("hardware id mismatch")
	ErrLicenseExpired     = errors.New("license expired")
	ErrClockTampering     = errors.New("clock tampering detected")
)

type LicenseStatus string

const (
	StatusActive      LicenseStatus = "active"
	StatusExpiring    LicenseStatus = "expiring"
	StatusGracePeriod LicenseStatus = "grace-period"
	StatusExpired     LicenseStatus = "expired"
)

type StatusSnapshot struct {
	Status        LicenseStatus `json:"status"`
	DaysRemaining int           `json:"days_remaining"`
	ExpiresAt     string        `json:"expires_at,omitempty"`
	HardwareID    string        `json:"hardware_id,omitempty"`
	Message       string        `json:"message,omitempty"`
}

type HardwareMismatchError struct {
	HardwareID string
	Cause      error
}

func (e *HardwareMismatchError) Error() string {
	if e == nil {
		return ErrHardwareIDMismatch.Error()
	}
	if e.Cause == nil {
		return fmt.Sprintf("%s: %s", ErrHardwareIDMismatch, e.HardwareID)
	}
	return fmt.Sprintf("%s: %s: %v", ErrHardwareIDMismatch, e.HardwareID, e.Cause)
}

func (e *HardwareMismatchError) Unwrap() error {
	return ErrHardwareIDMismatch
}

func ExtractHardwareID(err error) string {
	var mismatchErr *HardwareMismatchError
	if errors.As(err, &mismatchErr) {
		return mismatchErr.HardwareID
	}
	return ""
}

type ClockTamperError struct {
	LastHeartbeatUnix int64
	CurrentUnix       int64
}

func (e *ClockTamperError) Error() string {
	if e == nil {
		return ErrClockTampering.Error()
	}
	return fmt.Sprintf(
		"%s: current time (%d) is earlier than last recorded heartbeat (%d)",
		ErrClockTampering,
		e.CurrentUnix,
		e.LastHeartbeatUnix,
	)
}

func (e *ClockTamperError) Unwrap() error {
	return ErrClockTampering
}

func ExtractClockTamperTimes(err error) (int64, int64, bool) {
	var tamperErr *ClockTamperError
	if errors.As(err, &tamperErr) {
		return tamperErr.LastHeartbeatUnix, tamperErr.CurrentUnix, true
	}
	return 0, 0, false
}

type licensePayload struct {
	Signature string `json:"signature"`
	ExpiresAt string `json:"expires_at,omitempty"`
}

func parseLicenseContent(raw string) (string, *time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil, fmt.Errorf("license file is empty")
	}

	if strings.HasPrefix(trimmed, "{") {
		var payload licensePayload
		if err := json.Unmarshal([]byte(trimmed), &payload); err != nil {
			return "", nil, fmt.Errorf("failed to parse license payload: %w", err)
		}

		signature := strings.TrimSpace(payload.Signature)
		if signature == "" {
			return "", nil, fmt.Errorf("license payload missing signature")
		}

		expiry, err := parseExpiryDate(payload.ExpiresAt)
		if err != nil {
			return "", nil, err
		}
		return signature, expiry, nil
	}

	return trimmed, nil, nil
}

func parseExpiryDate(raw string) (*time.Time, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil, nil
	}

	layouts := []string{time.RFC3339, "2006-01-02"}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			exp := time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.Local)
			return &exp, nil
		}
	}

	return nil, fmt.Errorf("invalid expires_at value: %q", raw)
}

func calculateStatus(now time.Time, expiry *time.Time) (LicenseStatus, int) {
	if expiry == nil {
		return StatusActive, 0
	}

	nowDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
	expiryDate := time.Date(expiry.Year(), expiry.Month(), expiry.Day(), 0, 0, 0, 0, time.Local)
	daysRemaining := int(math.Floor(expiryDate.Sub(nowDate).Hours() / 24))

	if daysRemaining <= -gracePeriodDays {
		return StatusExpired, daysRemaining
	}
	if daysRemaining <= 0 {
		return StatusGracePeriod, daysRemaining
	}
	if daysRemaining <= expiryWarningDays {
		return StatusExpiring, daysRemaining
	}
	return StatusActive, daysRemaining
}
