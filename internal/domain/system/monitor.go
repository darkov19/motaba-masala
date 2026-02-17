package system

// SysMonitor defines the interface for OS-level system monitoring and control
type SysMonitor interface {
	CheckMutex(name string) (bool, error)
	GetDiskSpace(path string) (uint64, error)
	FocusWindow(title string) error
	ShowNotification(title, message string) error
}
