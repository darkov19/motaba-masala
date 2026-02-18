//go:build windows

package system

import (
	"fmt"
	"unsafe"

	// Added for unsafe.Pointer
	domainSys "masala_inventory_managment/internal/domain/system"

	"golang.org/x/sys/windows"
)

var (
	moduser32         = windows.NewLazyDLL("user32.dll")
	procFindWindowW   = moduser32.NewProc("FindWindowW")
	procShowWindow    = moduser32.NewProc("ShowWindow")
	procSetForeground = moduser32.NewProc("SetForegroundWindow")
)

type WindowsMonitor struct{}

func NewMonitor() domainSys.SysMonitor {
	return &WindowsMonitor{}
}

func (m *WindowsMonitor) CheckMutex(name string) (bool, error) {
	utf16Name, err := windows.UTF16PtrFromString(name)
	if err != nil {
		return false, err
	}

	// CreateMutex provides a named mutex.
	// We don't want to initially own it, we just want to see if it exists.
	handle, err := windows.CreateMutex(nil, false, utf16Name)
	if err != nil {
		if err == windows.ERROR_ALREADY_EXISTS {
			return true, nil
		}
		return false, fmt.Errorf("failed to create mutex: %w", err)
	}

	// If we successfully created it and it didn't exist, we hold the handle.
	// In a real app, we should keep this handle open for the duration of the app.
	_ = handle // Keep handle alive via some global or service state if needed.

	return false, nil
}

func (m *WindowsMonitor) FocusWindow(title string) error {
	titlePtr, err := windows.UTF16PtrFromString(title)
	if err != nil {
		return err
	}

	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(titlePtr)))
	if hwnd == 0 {
		return fmt.Errorf("could not find window with title %q", title)
	}

	procShowWindow.Call(hwnd, uintptr(windows.SW_RESTORE))
	procSetForeground.Call(hwnd)

	return nil
}

func (m *WindowsMonitor) GetDiskSpace(path string) (uint64, error) {
	pathPtr, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return 0, err
	}

	var freeBytesAvailable, totalNumberOfBytes, totalNumberOfFreeBytes uint64
	err = windows.GetDiskFreeSpaceEx(pathPtr, &freeBytesAvailable, &totalNumberOfBytes, &totalNumberOfFreeBytes)
	if err != nil {
		return 0, fmt.Errorf("failed to get disk free space: %w", err)
	}

	return freeBytesAvailable, nil
}

func (m *WindowsMonitor) ShowNotification(title, message string) error {
	return ShowNotification(title, message)
}
