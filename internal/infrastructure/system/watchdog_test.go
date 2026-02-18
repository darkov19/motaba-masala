package system

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestWatchdog_Timeout(t *testing.T) {
	interval := uint32(1)
	wd := NewWatchdog(interval)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var failed int32
	onFailure := func() {
		atomic.StoreInt32(&failed, 1)
	}

	wd.Start(ctx, onFailure)

	// Wait for longer than interval*2
	time.Sleep(3 * time.Second)

	if atomic.LoadInt32(&failed) != 1 {
		t.Errorf("Expected watchdog to fail, but it didn't")
	}
}

func TestWatchdog_Ping(t *testing.T) {
	interval := uint32(1)
	wd := NewWatchdog(interval)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var failed int32
	onFailure := func() {
		atomic.StoreInt32(&failed, 1)
	}

	wd.Start(ctx, onFailure)

	// Ping regularly
	for i := 0; i < 3; i++ {
		time.Sleep(500 * time.Millisecond)
		wd.Ping()
	}

	if atomic.LoadInt32(&failed) != 0 {
		t.Errorf("Expected watchdog NOT to fail during pings, but it did")
	}
}
