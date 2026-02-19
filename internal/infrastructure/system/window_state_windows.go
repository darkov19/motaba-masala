//go:build windows

package system

import (
	"fmt"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var procIsIconic = moduser32.NewProc("IsIconic")
var procEnumWindows = moduser32.NewProc("EnumWindows")
var procGetWindowThreadProcessID = moduser32.NewProc("GetWindowThreadProcessId")
var procIsWindowVisible = moduser32.NewProc("IsWindowVisible")

func WindowIsMinimizedByTitle(title string) (bool, error) {
	titlePtr, err := windows.UTF16PtrFromString(title)
	if err != nil {
		return false, err
	}

	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(titlePtr)))
	if hwnd == 0 {
		return false, fmt.Errorf("window not found for title %q", title)
	}

	res, _, callErr := procIsIconic.Call(hwnd)
	if callErr != windows.ERROR_SUCCESS && callErr != nil {
		return false, callErr
	}
	return res != 0, nil
}

func WindowIsCurrentProcessMinimized() (bool, error) {
	currentPID := uint32(windows.GetCurrentProcessId())
	foundAny := false
	foundMinimized := false
	callback := syscall.NewCallback(func(hwnd uintptr, lparam uintptr) uintptr {
		var windowPID uint32
		procGetWindowThreadProcessID.Call(hwnd, uintptr(unsafe.Pointer(&windowPID)))
		if windowPID != currentPID {
			return 1
		}

		visible, _, _ := procIsWindowVisible.Call(hwnd)
		if visible == 0 {
			return 1
		}

		iconic, _, _ := procIsIconic.Call(hwnd)
		foundAny = true
		foundMinimized = iconic != 0
		return 0 // stop at first visible window for this process
	})

	ret, _, callErr := procEnumWindows.Call(callback, 0)
	if ret == 0 && !foundAny {
		if callErr != windows.ERROR_SUCCESS && callErr != nil {
			return false, callErr
		}
		return false, fmt.Errorf("no visible window found for current process")
	}
	if !foundAny {
		return false, fmt.Errorf("no visible window found for current process")
	}
	return foundMinimized, nil
}
