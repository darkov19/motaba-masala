//go:build !windows

package system

import (
	"fmt"
	domainSys "masala_inventory_managment/internal/domain/system"
	"os"
	"path/filepath"
	"syscall"
	"time"
)

type UnixMonitor struct {
	lockFile *os.File
}

func NewMonitor() domainSys.SysMonitor {
	return &UnixMonitor{}
}

func (m *UnixMonitor) CheckMutex(name string) (bool, error) {
	path := filepath.Join(os.TempDir(), fmt.Sprintf("%s.lock", name))
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0666)
	if err != nil {
		return false, fmt.Errorf("could not open lock file: %w", err)
	}

	// LOCK_EX: Exclusive lock
	// LOCK_NB: Non-blocking (fail if already locked)
	err = syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
	if err != nil {
		if err == syscall.EWOULDBLOCK {
			return true, nil
		}
		return false, fmt.Errorf("failed to flock: %w", err)
	}

	m.lockFile = file
	return false, nil
}

func (m *UnixMonitor) FocusWindow(title string) error {
	// Signal the first instance by touching the lock file or creating a 'ping' file
	pingFile := filepath.Join(os.TempDir(), "MasalaServerMutex.ping")
	_ = os.WriteFile(pingFile, []byte(fmt.Sprintf("%d", time.Now().Unix())), 0666)
	return nil
}

func (m *UnixMonitor) GetDiskSpace(path string) (uint64, error) {
	var stat syscall.Statfs_t
	err := syscall.Statfs(path, &stat)
	if err != nil {
		return 0, fmt.Errorf("failed to get disk space: %w", err)
	}

	// Available blocks * size per block = available space in bytes
	return uint64(stat.Bavail) * uint64(stat.Bsize), nil
}

func (m *UnixMonitor) ShowNotification(title, message string) error {
	return ShowNotification(title, message)
}
