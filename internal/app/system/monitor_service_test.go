package system

import (
	"context"
	"testing"
	"time"

	infraSys "masala_inventory_managment/internal/infrastructure/system"
)

// MockSysMonitor implements domainSys.SysMonitor for testing
type MockSysMonitor struct {
	diskSpace     uint64
	diskError     error
	mutexExists   bool
	mutexError    error
	notifications []string
	focusedWindow string
}

func (m *MockSysMonitor) GetDiskSpace(path string) (uint64, error) {
	return m.diskSpace, m.diskError
}

func (m *MockSysMonitor) CheckMutex(name string) (bool, error) {
	return m.mutexExists, m.mutexError
}

func (m *MockSysMonitor) FocusWindow(title string) error {
	m.focusedWindow = title
	return nil
}

func (m *MockSysMonitor) ShowNotification(title, message string) error {
	m.notifications = append(m.notifications, title+": "+message)
	return nil
}

func TestMonitorService_DiskSpaceAlert(t *testing.T) {
	// Setup Mock
	mockSys := &MockSysMonitor{
		diskSpace: 400 * 1024 * 1024, // 400MB (Below 500MB threshold)
	}
	watchdog := infraSys.NewWatchdog(10) // 10s watchdog

	// Create Service
	svc := NewMonitorService(mockSys, watchdog)

	// Create a context that acts as the "App Context"
	// Note: We cannot easily mock Wails Runtime EventsEmit without an interface wrapper
	// for the runtime, but we can verify the Notification was requested.
	// ctx, cancel := context.WithCancel(context.Background())
	// defer cancel()

	// Manually trigger check (since runDiskMonitor runs in background, we might race it)
	// But `runDiskMonitor` calls `checkDiskSpace` immediately on start.
	// We'll define a wait helper or just call the private method if we could (we can't from outside pkg unless same pkg).
	// Since we are in `package system`, we CAN call private methods if we are in `package system`.
	// Let's verify if `monitor_service.go` is in `package system`. Yes.

	// svc.ctx = ctx
	// We leave ctx nil to avoid triggering Wails EventsEmit which panics with non-Wails context
	svc.checkDiskSpace()

	// Verify Notification
	if len(mockSys.notifications) == 0 {
		t.Errorf("Expected notification for low disk space, got none")
	} else {
		expectedTitle := "Low Disk Space"
		if len(mockSys.notifications[0]) < len(expectedTitle) || mockSys.notifications[0][:len(expectedTitle)] != expectedTitle {
			t.Errorf("Expected notification title %q, got %q", expectedTitle, mockSys.notifications[0])
		}
	}

	// Test Healthy Case
	mockSys.diskSpace = 600 * 1024 * 1024 // 600MB
	mockSys.notifications = []string{}
	svc.checkDiskSpace()

	if len(mockSys.notifications) > 0 {
		t.Errorf("Expected NO notification for healthy disk space, got %v", mockSys.notifications)
	}
}

func TestMonitorService_WatchdogIntegration(t *testing.T) {
	mockSys := &MockSysMonitor{
		diskSpace: 100 * 1024 * 1024 * 1024, // 100GB (Safe)
	}
	watchdog := infraSys.NewWatchdog(1) // 1s fast watchdog

	svc := NewMonitorService(mockSys, watchdog)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.Start(ctx)

	// We just want to ensure Start() doesn't panic and pings happen.
	// Verifying pings requires inspecting watchdog state which is private/internal usually.
	// But infraSys.Watchdog might expose `LastPing`.
	// Let's just ensure it runs for a bit.
	time.Sleep(100 * time.Millisecond)
}
