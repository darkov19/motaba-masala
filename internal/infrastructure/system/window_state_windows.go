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

type enumMinimizedState struct {
	currentPID     uint32
	foundAny       bool
	foundMinimized bool
}

// NOTE: syscall.NewCallback has a hard runtime limit; create once and reuse.
var enumWindowsMinimizedCallback = syscall.NewCallback(func(hwnd uintptr, lparam uintptr) uintptr {
	state := (*enumMinimizedState)(unsafe.Pointer(lparam))
	if state == nil {
		return 1
	}

	var windowPID uint32
	procGetWindowThreadProcessID.Call(hwnd, uintptr(unsafe.Pointer(&windowPID)))
	if windowPID != state.currentPID {
		return 1
	}

	visible, _, _ := procIsWindowVisible.Call(hwnd)
	if visible == 0 {
		return 1
	}

	iconic, _, _ := procIsIconic.Call(hwnd)
	state.foundAny = true
	state.foundMinimized = iconic != 0
	return 0 // stop at first visible window for this process
})

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
	state := &enumMinimizedState{
		currentPID: uint32(windows.GetCurrentProcessId()),
	}

	ret, _, callErr := procEnumWindows.Call(enumWindowsMinimizedCallback, uintptr(unsafe.Pointer(state)))
	if ret == 0 && !state.foundAny {
		if callErr != windows.ERROR_SUCCESS && callErr != nil {
			return false, callErr
		}
		return false, fmt.Errorf("no visible window found for current process")
	}
	if !state.foundAny {
		return false, fmt.Errorf("no visible window found for current process")
	}
	return state.foundMinimized, nil
}
