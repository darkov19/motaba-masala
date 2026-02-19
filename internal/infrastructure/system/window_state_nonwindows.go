//go:build !windows

package system

import "fmt"

func WindowIsMinimizedByTitle(title string) (bool, error) {
	return false, fmt.Errorf("window minimize probe by title is only supported on windows")
}

func WindowIsCurrentProcessMinimized() (bool, error) {
	return false, fmt.Errorf("window minimize probe is only supported on windows")
}
