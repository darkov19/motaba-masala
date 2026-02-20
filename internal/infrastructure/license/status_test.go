package license

import (
	"testing"
	"time"
)

func TestParseLicenseContent_LegacySignature(t *testing.T) {
	signature, expiry, err := parseLicenseContent("abcd1234")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if signature != "abcd1234" {
		t.Fatalf("expected signature to match, got %q", signature)
	}
	if expiry != nil {
		t.Fatalf("expected no expiry for legacy license, got %v", expiry)
	}
}

func TestParseLicenseContent_JSONPayload(t *testing.T) {
	raw := `{"signature":"abcd1234","expires_at":"2026-03-01"}`
	signature, expiry, err := parseLicenseContent(raw)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if signature != "abcd1234" {
		t.Fatalf("expected signature to match, got %q", signature)
	}
	if expiry == nil || expiry.Format("2006-01-02") != "2026-03-01" {
		t.Fatalf("expected parsed expiry date, got %v", expiry)
	}
}

func TestCalculateStatus(t *testing.T) {
	now := time.Date(2026, 2, 20, 9, 0, 0, 0, time.Local)

	expiringAt := time.Date(2026, 3, 15, 0, 0, 0, 0, time.Local)
	status, days := calculateStatus(now, &expiringAt)
	if status != StatusExpiring || days != 23 {
		t.Fatalf("expected expiring with 23 days, got %s / %d", status, days)
	}

	graceAt := time.Date(2026, 2, 20, 0, 0, 0, 0, time.Local)
	status, days = calculateStatus(now, &graceAt)
	if status != StatusGracePeriod || days != 0 {
		t.Fatalf("expected grace period with 0 days, got %s / %d", status, days)
	}

	expiredAt := time.Date(2026, 2, 13, 0, 0, 0, 0, time.Local)
	status, days = calculateStatus(now, &expiredAt)
	if status != StatusExpired || days != -7 {
		t.Fatalf("expected expired with -7 days, got %s / %d", status, days)
	}
}
