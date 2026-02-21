//go:build !bindings

package masala_inventory_managment

import (
	"os"
	"strings"
	"testing"
)

func TestInstallerScriptContainsStory110HardeningRequirements(t *testing.T) {
	content, err := os.ReadFile("scripts/windows/installer/masala-installer.nsi")
	if err != nil {
		t.Fatalf("read installer script: %v", err)
	}

	text := string(content)
	required := []string{
		"RequestExecutionLevel admin",
		`nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Masala Inventory Server" dir=in action=allow program="$INSTDIR\masala_inventory_server.exe" enable=yes'`,
		`nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Masala Inventory Server TCP 8090" dir=in action=allow protocol=TCP localport=8090 program="$INSTDIR\masala_inventory_server.exe" enable=yes'`,
		`nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Masala Inventory Server UDP 8090" dir=in action=allow protocol=UDP localport=8090 program="$INSTDIR\masala_inventory_server.exe" enable=yes'`,
		`nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Masala Inventory Server"'`,
		`nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Masala Inventory Server TCP 8090"'`,
		`nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Masala Inventory Server UDP 8090"'`,
		`"Start automatically when Windows starts"`,
		`CreateShortCut "$SMSTARTUP\MasalaClient.lnk" "$INSTDIR\masala_inventory_client.exe"`,
		`CreateShortCut "$SMSTARTUP\MasalaServer.lnk" "$INSTDIR\masala_inventory_server.exe"`,
	}

	for _, snippet := range required {
		if !strings.Contains(text, snippet) {
			t.Fatalf("installer script missing required snippet: %s", snippet)
		}
	}
}
