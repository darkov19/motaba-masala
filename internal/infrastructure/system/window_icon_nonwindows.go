//go:build !windows

package system

import "fmt"

func SetWindowIconFromFile(title, iconPath string) error {
	return fmt.Errorf("window icon override is only supported on windows")
}
