package licensemode

import (
	"errors"
	"sync"
)

var ErrReadOnlyMode = errors.New("403 license expired: read-only mode active")

var (
	mu            sync.RWMutex
	writeEnforcer = func() error { return nil }
)

func SetWriteEnforcer(enforcer func() error) {
	mu.Lock()
	defer mu.Unlock()
	if enforcer == nil {
		writeEnforcer = func() error { return nil }
		return
	}
	writeEnforcer = enforcer
}

func RequireWriteAccess() error {
	mu.RLock()
	enforcer := writeEnforcer
	mu.RUnlock()
	return enforcer()
}
