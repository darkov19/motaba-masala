package errors

import "errors"

var (
	// ErrConcurrencyConflict is returned when an update attempts to write stale data.
	ErrConcurrencyConflict = errors.New("concurrency conflict")
)
