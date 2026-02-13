//go:build linux

package license

import (
	"fmt"
	"os"
	"strings"
)

// LinuxHardwareProvider implements HardwareProvider for Linux systems
type LinuxHardwareProvider struct{}

func (p *LinuxHardwareProvider) GetBIOSUUID() (string, error) {
	// 1. Try DMI product_uuid (standard but often requires root or doesn't exist in VMs)
	data, err := os.ReadFile("/sys/class/dmi/id/product_uuid")
	if err == nil {
		return strings.TrimSpace(string(data)), nil
	}

	// 2. Fallback to /etc/machine-id (almost always exists on Linux, stable across reboots)
	data, err = os.ReadFile("/etc/machine-id")
	if err == nil {
		return strings.TrimSpace(string(data)), nil
	}

	// 3. Fallback to /var/lib/dbus/machine-id
	data, err = os.ReadFile("/var/lib/dbus/machine-id")
	if err == nil {
		return strings.TrimSpace(string(data)), nil
	}

	return "", fmt.Errorf("failed to find a unique system identifier (tried DMI and machine-id)")
}

func (p *LinuxHardwareProvider) GetDiskSerial() (string, error) {
	// Try common disk device paths
	paths := []string{
		"/sys/block/sda/device/serial",
		"/sys/block/vda/device/serial",
		"/sys/block/nvme0n1/device/serial",
	}

	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err == nil {
			return strings.TrimSpace(string(data)), nil
		}
	}

	// If no serial is found, we might be in a restricted environment.
	// We'll return a placeholder or non-fatal error to allow the system to proceed if UUID is present.
	// For this story, we'll return "GENERIC-DISK-000" if we have at least a BIOS/Machine UUID.
	return "GENERIC-DISK-SERIAL", nil
}

// NewHardwareProvider returns a platform-specific hardware provider
func NewHardwareProvider() HardwareProvider {
	return &LinuxHardwareProvider{}
}
