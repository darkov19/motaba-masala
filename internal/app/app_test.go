package app

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestRestoreBackup_RequiresRecoveryMode(t *testing.T) {
	a := NewApp(true)
	a.SetRestoreHandler(func(string) error { return nil })

	if err := a.RestoreBackup("backups/backup-1.zip"); err == nil {
		t.Fatal("expected restore to be rejected outside recovery mode")
	}
}

func TestRestoreBackup_CallsHandlerInRecoveryMode(t *testing.T) {
	a := NewApp(true)
	a.SetRecoveryState(true, "recovery", []string{"backups/backup-1.zip"})

	called := false
	a.SetRestoreHandler(func(path string) error {
		called = path == "backups/backup-1.zip"
		return nil
	})

	if err := a.RestoreBackup("backups/backup-1.zip"); err != nil {
		t.Fatalf("expected restore to succeed in recovery mode, got %v", err)
	}
	if !called {
		t.Fatal("expected restore handler to be called")
	}
}

func TestGetLicenseStatus_UsesConfiguredProvider(t *testing.T) {
	a := NewApp(true)
	a.SetLicenseStatusProvider(func() (LicenseStatus, error) {
		return LicenseStatus{Status: "grace-period", DaysRemaining: -2}, nil
	})

	status, err := a.GetLicenseStatus()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if status.Status != "grace-period" || status.DaysRemaining != -2 {
		t.Fatalf("unexpected status: %+v", status)
	}
}

func TestGetLicenseLockoutState_ReturnsConfiguredState(t *testing.T) {
	a := NewApp(true)
	a.SetLicenseLockoutState(true, "hardware-mismatch", "Hardware ID Mismatch. Application is locked.", "machine-123")

	lockout := a.GetLicenseLockoutState()
	if !lockout.Enabled {
		t.Fatal("expected lockout to be enabled")
	}
	if lockout.Reason != "hardware-mismatch" {
		t.Fatalf("expected lockout reason to match, got %q", lockout.Reason)
	}
	if lockout.HardwareID != "machine-123" {
		t.Fatalf("expected hardware id to match, got %q", lockout.HardwareID)
	}
}

func TestGreet_ClientModeSucceedsWithoutConnectivityProbe(t *testing.T) {
	a := NewApp(false)

	msg, err := a.Greet("ping")
	if err != nil {
		t.Fatalf("expected greet to succeed, got error: %v", err)
	}
	if msg == "" {
		t.Fatal("expected non-empty greet message")
	}
}

func TestCheckServerReachability_ReturnsFalseWhenNetworkAndProbeFail(t *testing.T) {
	t.Setenv(envServerProbeAddr, "127.0.0.1:1")
	t.Setenv(envLocalSingleMachine, "0")

	a := NewApp(false)
	a.connectivityProbe = func() error {
		return errors.New("server process not reachable")
	}

	connected, err := a.CheckServerReachability()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if connected {
		t.Fatal("expected reachability to be false")
	}
}

func TestCheckServerReachability_UsesLocalDevFallbackProbe(t *testing.T) {
	t.Setenv(envServerProbeAddr, "127.0.0.1:1")
	t.Setenv(envLocalSingleMachine, "1")

	a := NewApp(false)
	a.connectivityProbe = func() error { return nil }

	connected, err := a.CheckServerReachability()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !connected {
		t.Fatal("expected reachability true via local-dev process fallback")
	}
}

func TestCheckServerReachability_DefaultsToLocalProcessProbeWhenNoServerAddrConfigured(t *testing.T) {
	t.Setenv(envServerProbeAddr, "")
	t.Setenv(envLocalSingleMachine, "0")

	a := NewApp(false)
	a.connectivityProbe = func() error { return nil }

	connected, err := a.CheckServerReachability()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !connected {
		t.Fatal("expected reachability true via default local process probe path")
	}
}

func TestLogin_ClientMode_UsesNetworkAuthAPI(t *testing.T) {
	server := newTestHTTPServerOrSkip(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/login" {
			t.Fatalf("expected /auth/login path, got %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST method, got %s", r.Method)
		}

		var payload map[string]string
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("failed to decode login payload: %v", err)
		}
		if payload["username"] != "admin" || payload["password"] != "secret" {
			t.Fatalf("unexpected payload: %#v", payload)
		}

		_ = json.NewEncoder(w).Encode(AuthTokenResult{
			Token:     "network-token",
			ExpiresAt: 1893456000,
		})
	}))
	defer server.Close()

	t.Setenv(envServerProbeAddr, server.URL)

	a := NewApp(false)
	token, err := a.Login("admin", "secret")
	if err != nil {
		t.Fatalf("expected login success, got %v", err)
	}
	if token.Token != "network-token" {
		t.Fatalf("expected network token, got %q", token.Token)
	}
}

func TestLogin_ClientMode_UsesNetworkErrorMessage(t *testing.T) {
	server := newTestHTTPServerOrSkip(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"message": "invalid credentials",
		})
	}))
	defer server.Close()

	t.Setenv(envServerProbeAddr, server.URL)

	a := NewApp(false)
	if _, err := a.Login("admin", "wrong"); err == nil || err.Error() != "invalid credentials" {
		t.Fatalf("expected invalid credentials error, got %v", err)
	}
}

func TestGetSessionRole_ClientMode_UsesNetworkAuthAPI(t *testing.T) {
	server := newTestHTTPServerOrSkip(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/session-role" {
			t.Fatalf("expected /auth/session-role path, got %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST method, got %s", r.Method)
		}
		_ = json.NewEncoder(w).Encode(map[string]string{
			"role": "Admin",
		})
	}))
	defer server.Close()

	t.Setenv(envServerProbeAddr, server.URL)

	a := NewApp(false)
	role, err := a.GetSessionRole("trusted-token")
	if err != nil {
		t.Fatalf("expected role lookup success, got %v", err)
	}
	if role != "Admin" {
		t.Fatalf("expected role Admin, got %q", role)
	}
}

func TestListUsers_ClientMode_UsesNetworkAuthAPI(t *testing.T) {
	server := newTestHTTPServerOrSkip(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/admin/users/list" {
			t.Fatalf("expected /admin/users/list path, got %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST method, got %s", r.Method)
		}

		_ = json.NewEncoder(w).Encode([]UserAccountResult{
			{Username: "admin", Role: "Admin", IsActive: true},
		})
	}))
	defer server.Close()

	t.Setenv(envServerProbeAddr, server.URL)

	a := NewApp(false)
	users, err := a.ListUsers(ListUsersInput{AuthToken: "admin-token"})
	if err != nil {
		t.Fatalf("expected list users success, got %v", err)
	}
	if len(users) != 1 || users[0].Username != "admin" {
		t.Fatalf("unexpected users response: %#v", users)
	}
}

func TestSetUserActive_ClientMode_UsesNetworkErrorMessage(t *testing.T) {
	server := newTestHTTPServerOrSkip(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/admin/users/active" {
			t.Fatalf("expected /admin/users/active path, got %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"message": "cannot modify the last active admin",
		})
	}))
	defer server.Close()

	t.Setenv(envServerProbeAddr, server.URL)

	a := NewApp(false)
	err := a.SetUserActive(SetUserActiveInput{
		AuthToken: "admin-token",
		Username:  "admin",
		IsActive:  false,
	})
	if err == nil || err.Error() != "cannot modify the last active admin" {
		t.Fatalf("expected conflict message from API, got %v", err)
	}
}

func newTestHTTPServerOrSkip(t *testing.T, handler http.Handler) (server *httptest.Server) {
	t.Helper()
	defer func() {
		if recovered := recover(); recovered != nil {
			t.Skipf("skipping network socket test in restricted runtime: %v", recovered)
		}
	}()
	return httptest.NewServer(handler)
}

func TestResolveProbeAddress(t *testing.T) {
	if got := resolveProbeAddress(""); got != defaultServerProbeAddr {
		t.Fatalf("expected default addr %q, got %q", defaultServerProbeAddr, got)
	}
	if got := resolveProbeAddress("http://10.0.0.5:8090/health"); got != "10.0.0.5:8090" {
		t.Fatalf("expected parsed host:port, got %q", got)
	}
	if got := resolveProbeAddress("10.0.0.7:9000"); got != "10.0.0.7:9000" {
		t.Fatalf("expected raw host:port passthrough, got %q", got)
	}
}

func TestIsLocalSingleMachineModeEnabled(t *testing.T) {
	t.Setenv(envLocalSingleMachine, "true")
	if !isLocalSingleMachineModeEnabled() {
		t.Fatal("expected local single machine mode to be enabled")
	}

	t.Setenv(envLocalSingleMachine, "0")
	if isLocalSingleMachineModeEnabled() {
		t.Fatal("expected local single machine mode to be disabled")
	}
}

func TestMain(m *testing.M) {
	// Ensure tests don't inherit machine-specific probe settings.
	_ = os.Unsetenv(envServerProbeAddr)
	_ = os.Unsetenv(envLocalSingleMachine)
	os.Exit(m.Run())
}
