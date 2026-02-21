//go:build windows

package license

import (
	"fmt"
	"os/exec"
	"syscall"
	"strings"
)

// WindowsHardwareProvider implements HardwareProvider for Windows systems
type WindowsHardwareProvider struct{}

func newHiddenCommand(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd
}

func (p *WindowsHardwareProvider) GetBIOSUUID() (string, error) {
	// Execute: wmic csproduct get uuid
	cmd := newHiddenCommand("wmic", "csproduct", "get", "uuid")
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Fallback to PowerShell if wmic fails (which might happen on newer Windows)
		psCmd := newHiddenCommand("powershell", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", "Get-WmiObject Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID")
		psOutput, psErr := psCmd.CombinedOutput()
		if psErr != nil {
			return "", fmt.Errorf("failed to get BIOS UUID: %v (wmic) / %v (powershell)", err, psErr)
		}
		return cleanOutput(string(psOutput)), nil
	}
	return cleanOutput(string(output)), nil
}

func (p *WindowsHardwareProvider) GetDiskSerial() (string, error) {
	// Execute: wmic diskdrive get serialnumber
	cmd := newHiddenCommand("wmic", "diskdrive", "get", "serialnumber")
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Fallback to PowerShell
		psCmd := newHiddenCommand("powershell", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", "Get-WmiObject Win32_DiskDrive | Select-Object -ExpandProperty SerialNumber")
		psOutput, psErr := psCmd.CombinedOutput()
		if psErr != nil {
			return "GENERIC-DISK-SERIAL", nil // Non-fatal
		}
		return cleanOutput(string(psOutput)), nil
	}
	return cleanOutput(string(output)), nil
}

// cleanOutput parses the command output to find the value
func cleanOutput(output string) string {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(strings.ToLower(trimmed), "uuid") || strings.HasPrefix(strings.ToLower(trimmed), "serialnumber") {
			continue
		}
		// Return the first non-header, non-empty line
		return trimmed
	}
	return ""
}

// NewHardwareProvider returns a platform-specific hardware provider
func NewHardwareProvider() HardwareProvider {
	return &WindowsHardwareProvider{}
}
