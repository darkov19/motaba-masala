//go:build windows

package system

import (
	"log/slog"
	"os/exec"
	"strings"

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
			if fallbackErr := showBalloonTipFallback(title, message); fallbackErr != nil {
				slog.Error("ShowNotification: fallback balloon failed", "error", fallbackErr, "title", title)
			}
		} else {
			slog.Info("ShowNotification: toast sent", "title", title)
		}
	}()
	return nil
}

func showBalloonTipFallback(title, message string) error {
	escape := func(s string) string {
		return strings.ReplaceAll(s, "'", "''")
	}
	ps := "$ErrorActionPreference='Stop';" +
		"Add-Type -AssemblyName System.Windows.Forms;" +
		"Add-Type -AssemblyName System.Drawing;" +
		"$n=New-Object System.Windows.Forms.NotifyIcon;" +
		"$n.Icon=[System.Drawing.SystemIcons]::Information;" +
		"$n.BalloonTipTitle='" + escape(title) + "';" +
		"$n.BalloonTipText='" + escape(message) + "';" +
		"$n.Visible=$true;" +
		"$n.ShowBalloonTip(3000);" +
		"Start-Sleep -Milliseconds 3500;" +
		"$n.Dispose();"

	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps)
	return cmd.Run()
}
