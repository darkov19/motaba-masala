//go:build windows

package system

// ShowNotification is a stub for Windows where native Wails/Win32 APIs might be used
func ShowNotification(title, message string) error {
	return nil
}
