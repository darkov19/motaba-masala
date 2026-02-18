package system

import (
	"errors"
	"sync/atomic"
)

var (
	globalRecoveryMode atomic.Bool
	ErrRecoveryMode    = errors.New("system is in recovery mode; restore database first")
)

func SetRecoveryMode(enabled bool) {
	globalRecoveryMode.Store(enabled)
}

func RequireNormalMode() error {
	if globalRecoveryMode.Load() {
		return ErrRecoveryMode
	}
	return nil
}
