package license

import (
	"crypto/ed25519"
	"encoding/binary"
	"encoding/hex"
	"os"
	"testing"
	"time"
)

type MockHardwareProvider struct {
	UUID   string
	Serial string
}

func (m *MockHardwareProvider) GetBIOSUUID() (string, error)   { return m.UUID, nil }
func (m *MockHardwareProvider) GetDiskSerial() (string, error) { return m.Serial, nil }

func TestHardwareFingerprint(t *testing.T) {
	mock := &MockHardwareProvider{UUID: "uuid-123", Serial: "serial-456"}
	id, err := GetHardwareID(mock)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := "uuid-123:serial-456"
	if id != expected {
		t.Errorf("expected %s, got %s", expected, id)
	}
}

func TestVerifyLicense(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(nil)
	hwID := "some-hw-id"
	sig := ed25519.Sign(priv, []byte(hwID))

	pubHex := hex.EncodeToString(pub)
	sigHex := hex.EncodeToString(sig)

	// Valid signature
	err := VerifyLicense(pubHex, sigHex, hwID)
	if err != nil {
		t.Errorf("verification failed for valid signature: %v", err)
	}

	// Invalid HW ID
	err = VerifyLicense(pubHex, sigHex, "wrong-hw-id")
	if err == nil {
		t.Error("verification should have failed for wrong HW ID")
	}

	// Invalid signature
	err = VerifyLicense(pubHex, hex.EncodeToString(make([]byte, 64)), hwID)
	if err == nil {
		t.Error("verification should have failed for invalid signature")
	}
}

func TestHeartbeat(t *testing.T) {
	tmpFile := "test_hb"
	defer os.Remove(tmpFile)

	// Test first run
	err := CheckClockTampering(tmpFile)
	if err != nil {
		t.Errorf("expected no error on first run, got %v", err)
	}

	// Test subsequent run (same time or later)
	err = CheckClockTampering(tmpFile)
	if err != nil {
		t.Errorf("expected no error on subsequent run, got %v", err)
	}

	// Simulated clock tampering not easily testable without mocking time.Now()
	// but we can manually write a future timestamp
	currentTime := time.Now().Unix()
	futureTime := currentTime + 10000 // 10000 seconds into the future

	data := make([]byte, 8)
	binary.BigEndian.PutUint64(data, uint64(futureTime))
	os.WriteFile(tmpFile, data, 0600)

	err = CheckClockTampering(tmpFile)
	if err == nil {
		t.Error("clock tampering should have been detected")
	}
}
