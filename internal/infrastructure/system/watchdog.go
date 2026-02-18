package system

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

type Watchdog struct {
	interval uint32
	lastPing time.Time
	mu       sync.Mutex
	stopChan chan struct{}
}

func NewWatchdog(intervalSeconds uint32) *Watchdog {
	return &Watchdog{
		interval: intervalSeconds,
		stopChan: make(chan struct{}),
	}
}

func (w *Watchdog) Ping() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.lastPing = time.Now()
}

func (w *Watchdog) Start(ctx context.Context, onFailure func()) {
	w.Ping()
	go func() {
		ticker := time.NewTicker(time.Duration(w.interval) * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				w.mu.Lock()
				timeout := time.Duration(w.interval) * time.Second * 2
				if time.Since(w.lastPing) > timeout {
					slog.Error("Watchdog detected unresponsiveness!", "timeout", timeout)
					if onFailure != nil {
						onFailure()
					}
				}
				w.mu.Unlock()
			case <-w.stopChan:
				return
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (w *Watchdog) Stop() {
	select {
	case <-w.stopChan:
		// already stopped
	default:
		close(w.stopChan)
	}
}
