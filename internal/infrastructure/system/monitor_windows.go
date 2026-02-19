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
	procLoadImageW    = moduser32.NewProc("LoadImageW")
	procSendMessageW  = moduser32.NewProc("SendMessageW")
)

type WindowsMonitor struct {
	mutexHandle windows.Handle
}

const (
	imageIcon      = 1
	lrLoadFromFile = 0x0010
	lrDefaultSize  = 0x0040
	wmSetIcon      = 0x0080
	iconSmall      = 0
	iconBig        = 1
)

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
			if handle != 0 {
				_ = windows.CloseHandle(handle)
			}
			return true, nil
		}
		return false, fmt.Errorf("failed to create mutex: %w", err)
	}

	// Keep mutex handle open for process lifetime so single-instance lock remains active.
	m.mutexHandle = handle

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

func SetWindowIconFromFile(title, iconPath string) error {
	titlePtr, err := windows.UTF16PtrFromString(title)
	if err != nil {
		return err
	}
	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(titlePtr)))
	if hwnd == 0 {
		return fmt.Errorf("window not found for title %q", title)
	}

	iconPathPtr, err := windows.UTF16PtrFromString(iconPath)
	if err != nil {
		return err
	}

	hIcon, _, _ := procLoadImageW.Call(
		0,
		uintptr(unsafe.Pointer(iconPathPtr)),
		imageIcon,
		0,
		0,
		lrLoadFromFile|lrDefaultSize,
	)
	if hIcon == 0 {
		return fmt.Errorf("failed to load icon from %s", iconPath)
	}

	procSendMessageW.Call(hwnd, wmSetIcon, iconSmall, hIcon)
	procSendMessageW.Call(hwnd, wmSetIcon, iconBig, hIcon)
	return nil
}
