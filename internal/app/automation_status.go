package app

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type AutomationStatus struct {
	Enabled      bool              `json:"enabled"`
	CurrentCheck string            `json:"current_check"`
	LastEvent    string            `json:"last_event"`
	UpdatedAt    string            `json:"updated_at"`
	Checks       map[string]string `json:"checks"`
}

func (a *App) GetAutomationStatus() AutomationStatus {
	statusPath := os.Getenv("MASALA_AUTOMATION_STATUS_FILE")
	if statusPath == "" {
		statusPath = filepath.Join(os.TempDir(), "masala-story-1-11-status.json")
	}

	raw, err := os.ReadFile(statusPath)
	if err != nil {
		return AutomationStatus{Enabled: false}
	}

	var status AutomationStatus
	if err := json.Unmarshal(raw, &status); err != nil {
		return AutomationStatus{Enabled: false}
	}
	if status.Checks == nil {
		status.Checks = map[string]string{}
	}
	return status
}
