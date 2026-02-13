package license

import (
	"fmt"
)

type HardwareProvider interface {
	GetBIOSUUID() (string, error)
	GetDiskSerial() (string, error)
}

// GetHardwareID concatenates BIOS UUID and Disk Serial to create a unique fingerprint
func GetHardwareID(p HardwareProvider) (string, error) {
	uuid, err := p.GetBIOSUUID()
	if err != nil {
		return "", err
	}
	serial, err := p.GetDiskSerial()
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s:%s", uuid, serial), nil
}
