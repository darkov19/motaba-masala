//go:build windows

package system

import (
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

var procIsIconic = moduser32.NewProc("IsIconic")

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
