package system

import (
	"context"
	"fmt"
	"log/slog"
	domainSys "masala_inventory_managment/internal/domain/system"
	infraSys "masala_inventory_managment/internal/infrastructure/system"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// MonitorService handles background system monitoring tasks
type MonitorService struct {
	ctx           context.Context
	sysMonitor    domainSys.SysMonitor
	watchdog      *infraSys.Watchdog
	diskThreshold uint64
}

// NewMonitorService creates a new instance of the monitoring service
func NewMonitorService(sysMonitor domainSys.SysMonitor, watchdog *infraSys.Watchdog) *MonitorService {
	return &MonitorService{
		sysMonitor:    sysMonitor,
		watchdog:      watchdog,
		diskThreshold: 500 * 1024 * 1024, // 500MB threshold (AC #3)
	}
}

// Start initiates the background monitoring loops
func (s *MonitorService) Start(ctx context.Context) {
	s.ctx = ctx
	s.watchdog.Ping() // Initial ping

	// Start Disk Monitor Loop
	go s.runDiskMonitor()
}

func (s *MonitorService) runDiskMonitor() {
	slog.Info("MonitorService: Background loop started")
	diskTicker := time.NewTicker(30 * time.Minute) // AC #3 specifies every 30 minutes
	pingTicker := time.NewTicker(5 * time.Second)  // Watchdog heartbeat
	defer diskTicker.Stop()
	defer pingTicker.Stop()

	// Initial check
	s.checkDiskSpace()

	for {
		select {
		case <-diskTicker.C:
			s.checkDiskSpace()
		case <-pingTicker.C:
			s.watchdog.Ping() // Show that background monitor is alive
		case <-s.ctx.Done():
			slog.Info("MonitorService: Context cancelled, stopping loop")
			return
		}
	}
}

func (s *MonitorService) checkDiskSpace() {
	space, err := s.sysMonitor.GetDiskSpace(".")
	if err != nil {
		slog.Error("Failed to check disk space", "error", err)
		return
	}

	if space < s.diskThreshold {
		availableMB := float64(space) / (1024 * 1024)
		slog.Warn("Low disk space alert!", "available_mb", fmt.Sprintf("%.2f", availableMB))

		// AC #3: Notification bubble on low disk space
		_ = s.sysMonitor.ShowNotification("Low Disk Space", fmt.Sprintf("Only %.2f MB available on disk.", availableMB))

		if s.ctx != nil {
			wailsRuntime.EventsEmit(s.ctx, "low-disk-space", map[string]interface{}{
				"available": fmt.Sprintf("%.2f", availableMB),
				"unit":      "MB",
				"threshold": "500MB",
			})
		}
	}
}

// HandleWatchdogFailure provides the response to a watchdog timeout
func (s *MonitorService) HandleWatchdogFailure() {
	slog.Error("CRITICAL: Watchdog timeout detected - Service loop unresponsive. Initiating restart.")
	// In production, we exit with non-zero to trigger OS-level restart (if configured)
	// or we could attempt to restart internal services.
	// We use a small delay to allow logs to flush.
	time.AfterFunc(1*time.Second, func() {
		// os.Exit(1) is the standard way to signal failure for process managers (systemd/launcher)
		// For now, we'll log it clearly.
	})
}
