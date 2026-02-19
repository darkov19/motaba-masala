//go:build windows

package main

import (
	"os/exec"

	"golang.org/x/sys/windows"
)

func detachProcess(cmd *exec.Cmd) {
	cmd.SysProcAttr = &windows.SysProcAttr{
		CreationFlags: windows.CREATE_NEW_PROCESS_GROUP | windows.DETACHED_PROCESS,
	}
}
