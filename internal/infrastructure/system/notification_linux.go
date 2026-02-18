//go:build linux

package system

import (
	"context"
	"log/slog"
	"os/exec"
	"time"
)

// ShowNotification sends a desktop notification on Linux using notify-send.
// It is non-blocking to ensure the caller (like monitoring loops) is never stalled.
func ShowNotification(title, message string) error {
	// Run in a goroutine to be non-blocking
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, "notify-send", "-a", "Masala Inventory", title, message)
		if output, err := cmd.CombinedOutput(); err != nil {
			// Expected to fail/timeout in some WSL2 environments without a notification daemon
			slog.Debug("ShowNotification: notify-send failed or timed out", "error", err, "output", string(output), "title", title)
		} else {
			slog.Info("ShowNotification: Notification sent successfully", "title", title)
		}
	}()
	return nil
}
