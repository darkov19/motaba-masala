//go:build windows

package system

import (
	"log/slog"

	"gopkg.in/toast.v1"
)

// ShowNotification sends a desktop notification on Windows using native toasts.
func ShowNotification(title, message string) error {
	go func() {
		notification := toast.Notification{
			AppID:   "Masala Inventory Server",
			Title:   title,
			Message: message,
		}
		if err := notification.Push(); err != nil {
			slog.Error("ShowNotification: toast failed", "error", err, "title", title)
		} else {
			slog.Info("ShowNotification: toast sent", "title", title)
		}
	}()
	return nil
}
