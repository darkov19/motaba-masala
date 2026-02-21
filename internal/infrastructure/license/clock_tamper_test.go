package license

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestValidateLicense_ClockTamperDetectedWithInjectedClock(t *testing.T) {
	base := time.Date(2026, 2, 21, 10, 0, 0, 0, time.UTC)
	heartbeatPath := filepath.Join(t.TempDir(), ".hb")

	data := make([]byte, 8)
	binary.BigEndian.PutUint64(data, uint64(base.Add(24*time.Hour).Unix()))
	if err := os.WriteFile(heartbeatPath, data, 0600); err != nil {
		t.Fatalf("failed to write heartbeat fixture: %v", err)
	}

	svc := NewLicensingService("unused-public-key", "unused-license-file", heartbeatPath)
	svc.hwProvider = &MockHardwareProvider{
		UUID:   "uuid-test",
		Serial: "serial-test",
	}
	svc.clockNow = func() time.Time { return base }

	err := svc.ValidateLicense()
	if err == nil {
		t.Fatal("expected clock tampering error")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "clock tampering detected") {
		t.Fatalf("expected clock tampering message, got: %v", err)
	}
}
