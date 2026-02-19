//go:build windows

package system

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/toast.v1"
)

// ShowNotification sends a desktop notification on Windows using native toasts.
func ShowNotification(title, message string) error {
	go func() {
		logPath := filepath.Join(os.TempDir(), "masala-notification.log")
		writeNotificationLog(logPath, "notification requested title=%q message=%q", title, message)

		toastErr := error(nil)
		notification := toast.Notification{
			AppID:   "Masala Inventory Server",
			Title:   title,
			Message: message,
		}
		if err := notification.Push(); err != nil {
			toastErr = err
			slog.Error("ShowNotification: toast failed", "error", err, "title", title)
			writeNotificationLog(logPath, "toast failed: %v", err)
		} else {
			slog.Info("ShowNotification: toast sent", "title", title)
			writeNotificationLog(logPath, "toast sent successfully")
		}

		// Always attempt balloon tip so users still see a visible signal even when
		// Windows toast is suppressed by system settings/focus mode.
		if fallbackErr := showBalloonTipFallback(title, message); fallbackErr != nil {
			slog.Error("ShowNotification: fallback balloon failed", "error", fallbackErr, "title", title)
			writeNotificationLog(logPath, "balloon fallback failed: %v", fallbackErr)
			if toastErr != nil {
				if messageBoxErr := showMessageBoxFallback(title, message); messageBoxErr != nil {
					slog.Error("ShowNotification: fallback message box failed", "error", messageBoxErr, "title", title)
					writeNotificationLog(logPath, "message box fallback failed: %v", messageBoxErr)
				} else {
					writeNotificationLog(logPath, "message box fallback succeeded")
				}
			}
		} else {
			writeNotificationLog(logPath, "balloon fallback succeeded")
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

	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-STA", "-WindowStyle", "Hidden", "-Command", ps)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func showMessageBoxFallback(title, message string) error {
	escape := func(s string) string {
		return strings.ReplaceAll(s, "'", "''")
	}
	ps := "$ErrorActionPreference='Stop';" +
		"Add-Type -AssemblyName PresentationFramework;" +
		"[System.Windows.MessageBox]::Show('" + escape(message) + "','" + escape(title) + "','OK','Information') | Out-Null"
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-STA", "-Command", ps)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func writeNotificationLog(path string, format string, args ...interface{}) {
	line := fmt.Sprintf("%s %s\n", time.Now().Format(time.RFC3339Nano), fmt.Sprintf(format, args...))
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = f.WriteString(line)
}
