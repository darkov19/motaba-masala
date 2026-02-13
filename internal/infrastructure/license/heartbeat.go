package license

import (
	"encoding/binary"
	"fmt"
	"os"
	"time"
)

// CheckClockTampering verifies that the current system time is not earlier than the last recorded heartbeat
func CheckClockTampering(heartbeatPath string) error {
	data, err := os.ReadFile(heartbeatPath)
	if err != nil {
		if os.IsNotExist(err) {
			// First run, create the heartbeat
			return UpdateHeartbeat(heartbeatPath)
		}
		return fmt.Errorf("failed to read heartbeat file: %w", err)
	}

	if len(data) > 8 {
		data = data[:8]
	} else if len(data) < 8 {
		return fmt.Errorf("invalid heartbeat file format: too short")
	}

	lastHeartbeatUnix := int64(binary.BigEndian.Uint64(data))
	// Simple obfuscation/XOR could be added here, but for now we'll stick to raw big-endian uint64

	currentTime := time.Now().Unix()
	if currentTime < lastHeartbeatUnix {
		return fmt.Errorf("clock tampering detected: current time is earlier than last recorded heartbeat")
	}

	return nil
}

// UpdateHeartbeat writes the current unix timestamp to the heartbeat file
func UpdateHeartbeat(heartbeatPath string) error {
	currentTime := time.Now().Unix()
	data := make([]byte, 8)
	binary.BigEndian.PutUint64(data, uint64(currentTime))

	err := os.WriteFile(heartbeatPath, data, 0600)
	if err != nil {
		return fmt.Errorf("failed to update heartbeat file: %w", err)
	}
	return nil
}
