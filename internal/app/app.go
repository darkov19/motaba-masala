package app

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	appAuth "masala_inventory_managment/internal/app/auth"
	appInventory "masala_inventory_managment/internal/app/inventory"
	domainAuth "masala_inventory_managment/internal/domain/auth"
)

type RecoveryState struct {
	Enabled bool     `json:"enabled"`
	Message string   `json:"message"`
	Backups []string `json:"backups"`
}

type LicenseStatus struct {
	Status        string `json:"status"`
	DaysRemaining int    `json:"days_remaining"`
	ExpiresAt     string `json:"expires_at,omitempty"`
	Message       string `json:"message,omitempty"`
	HardwareID    string `json:"hardware_id,omitempty"`
}

type LicenseLockoutState struct {
	Enabled    bool   `json:"enabled"`
	Reason     string `json:"reason,omitempty"`
	Message    string `json:"message"`
	HardwareID string `json:"hardware_id,omitempty"`
}

type LockoutRetryResult struct {
	Passed  bool   `json:"passed"`
	Message string `json:"message"`
}

// App struct
type App struct {
	ctx                   context.Context
	isServer              bool
	forceQuit             bool
	recoveryState         RecoveryState
	restoreHandler        func(string) error
	licenseStatusProvider func() (LicenseStatus, error)
	lockoutState          LicenseLockoutState
	connectivityProbe     func() error
	lockoutRetryHandler   func() (LockoutRetryResult, error)
	inventoryService      *appInventory.Service
	authService           *appAuth.Service
	sessionRoleResolver   func(string) (string, error)
}

const (
	defaultServerProbeAddr = "127.0.0.1:8090"
	envServerProbeAddr     = "MASALA_SERVER_PROBE_ADDR"
	envLocalSingleMachine  = "MASALA_LOCAL_SINGLE_MACHINE_MODE"
	serverProbeTimeout     = 1500 * time.Millisecond
	serverAPITimeout       = 5 * time.Second
)

// NewApp creates a new App application struct
func NewApp(isServer bool) *App {
	connectivityProbe := func() error { return nil }
	if !isServer {
		connectivityProbe = probeLocalServerProcess
	}

	return &App{
		isServer:          isServer,
		connectivityProbe: connectivityProbe,
		licenseStatusProvider: func() (LicenseStatus, error) {
			return LicenseStatus{Status: "active", DaysRemaining: 0}, nil
		},
	}
}

// Startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

// Context returns the app context
func (a *App) Context() context.Context {
	return a.ctx
}

func (a *App) IsServerMode() bool {
	return a.isServer
}

func (a *App) Greet(name string) (string, error) {
	return fmt.Sprintf("Hello %s, It's show time!", name), nil
}

// CheckServerReachability probes server reachability for client-mode connectivity status.
// Behavior:
//   - If MASALA_SERVER_PROBE_ADDR is set: use network probe for that target.
//   - If not set: use local process probe by default (single-machine compatibility).
//   - Optional local-dev fallback can be enabled via MASALA_LOCAL_SINGLE_MACHINE_MODE=1
//     to use process probing when explicit network probe fails.
func (a *App) CheckServerReachability() (bool, error) {
	if a.isServer {
		return true, nil
	}

	rawProbeAddr := strings.TrimSpace(os.Getenv(envServerProbeAddr))
	if rawProbeAddr == "" {
		if a.connectivityProbe != nil {
			if err := a.connectivityProbe(); err == nil {
				return true, nil
			}
		}
		// Secondary fallback for environments with a local TCP server but no process match.
		if err := probeTCPAddress(defaultServerProbeAddr); err == nil {
			return true, nil
		}
		return false, nil
	}

	probeAddr := resolveProbeAddress(rawProbeAddr)
	if err := probeTCPAddress(probeAddr); err == nil {
		return true, nil
	}

	if isLocalSingleMachineModeEnabled() && a.connectivityProbe != nil {
		if err := a.connectivityProbe(); err == nil {
			return true, nil
		}
	}

	return false, nil
}

func probeLocalServerProcess() error {
	candidates := []string{
		"masala_inventory_server.exe",
		"masala_inventory_server",
		"masala_inventory_managment.exe",
		"masala_inventory_managment",
		"server.exe",
		"server",
	}

	for _, candidate := range candidates {
		running, err := isProcessRunning(candidate)
		if err != nil {
			return err
		}
		if running {
			return nil
		}
	}

	return fmt.Errorf("server process not reachable")
}

func resolveProbeAddress(raw string) string {
	probe := strings.TrimSpace(raw)
	if probe == "" {
		return defaultServerProbeAddr
	}

	if strings.Contains(probe, "://") {
		if parsed, err := url.Parse(probe); err == nil {
			host := strings.TrimSpace(parsed.Host)
			if host != "" {
				return host
			}
		}
	}

	return probe
}

func probeTCPAddress(address string) error {
	conn, err := net.DialTimeout("tcp", address, serverProbeTimeout)
	if err != nil {
		return err
	}
	_ = conn.Close()
	return nil
}

func isLocalSingleMachineModeEnabled() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv(envLocalSingleMachine)))
	return raw == "1" || raw == "true" || raw == "yes"
}

func isProcessRunning(processName string) (bool, error) {
	switch runtime.GOOS {
	case "windows":
		target := processName
		if !strings.HasSuffix(strings.ToLower(target), ".exe") {
			target += ".exe"
		}

		out, err := newProbeCommand("tasklist", "/FO", "CSV", "/NH", "/FI", "IMAGENAME eq "+target).CombinedOutput()
		if err != nil {
			return false, fmt.Errorf("tasklist probe failed: %w", err)
		}

		reader := csv.NewReader(strings.NewReader(string(out)))
		for {
			record, readErr := reader.Read()
			if readErr == io.EOF {
				break
			}
			if readErr != nil {
				break
			}
			if len(record) == 0 {
				continue
			}

			imageName := strings.TrimSpace(record[0])
			if strings.EqualFold(imageName, target) {
				return true, nil
			}
		}

		lowerOut := strings.ToLower(string(out))
		if strings.Contains(lowerOut, strings.ToLower(target)) {
			return true, nil
		}
		return false, nil
	default:
		cmd := newProbeCommand("pgrep", "-f", processName)
		if err := cmd.Run(); err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
				return false, nil
			}
			return false, fmt.Errorf("pgrep probe failed: %w", err)
		}
		return true, nil
	}
}

// SetForceQuit allows bypassing the minimize-to-tray logic
func (a *App) SetForceQuit(force bool) {
	a.forceQuit = force
}

// IsForceQuit returns whether the app should actually quit
func (a *App) IsForceQuit() bool {
	return a.forceQuit
}

// SetRecoveryState configures server recovery mode details for the frontend.
func (a *App) SetRecoveryState(enabled bool, message string, backups []string) {
	a.recoveryState = RecoveryState{
		Enabled: enabled,
		Message: message,
		Backups: backups,
	}
}

// GetRecoveryState returns current recovery mode state.
func (a *App) GetRecoveryState() RecoveryState {
	return a.recoveryState
}

// SetRestoreHandler configures the restore callback used by RestoreBackup.
func (a *App) SetRestoreHandler(handler func(string) error) {
	a.restoreHandler = handler
}

// RestoreBackup restores a selected backup and triggers restart logic via configured handler.
func (a *App) RestoreBackup(backupPath string) error {
	if !a.recoveryState.Enabled {
		return fmt.Errorf("restore is only available in recovery mode")
	}
	if a.restoreHandler == nil {
		return fmt.Errorf("restore handler is not configured")
	}
	return a.restoreHandler(backupPath)
}

func (a *App) SetLicenseStatusProvider(provider func() (LicenseStatus, error)) {
	if provider == nil {
		a.licenseStatusProvider = func() (LicenseStatus, error) {
			return LicenseStatus{Status: "active", DaysRemaining: 0}, nil
		}
		return
	}
	a.licenseStatusProvider = provider
}

func (a *App) GetLicenseStatus() (LicenseStatus, error) {
	return a.licenseStatusProvider()
}

func (a *App) SetLicenseLockoutState(enabled bool, reason, message, hardwareID string) {
	a.lockoutState = LicenseLockoutState{
		Enabled:    enabled,
		Reason:     reason,
		Message:    message,
		HardwareID: hardwareID,
	}
}

func (a *App) GetLicenseLockoutState() LicenseLockoutState {
	return a.lockoutState
}

func (a *App) SetLockoutRetryHandler(handler func() (LockoutRetryResult, error)) {
	a.lockoutRetryHandler = handler
}

func (a *App) RetryLockoutValidation() (LockoutRetryResult, error) {
	if a.lockoutRetryHandler == nil {
		return LockoutRetryResult{
			Passed:  false,
			Message: "Retry validation is not configured for this mode.",
		}, nil
	}
	return a.lockoutRetryHandler()
}

func (a *App) SetSessionRoleResolver(resolver func(string) (string, error)) {
	a.sessionRoleResolver = resolver
}

func (a *App) SetAuthService(service *appAuth.Service) {
	a.authService = service
}

func (a *App) GetSessionRole(authToken string) (string, error) {
	token := strings.TrimSpace(authToken)
	if token == "" {
		return "", fmt.Errorf("auth token is required")
	}
	if !a.isServer && a.sessionRoleResolver == nil {
		return fetchSessionRoleOverNetwork(token)
	}
	if a.sessionRoleResolver == nil {
		return "", fmt.Errorf("session role resolver is not configured")
	}
	return a.sessionRoleResolver(token)
}

func (a *App) SetInventoryService(service *appInventory.Service) {
	a.inventoryService = service
}

type AuthTokenResult struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
}

type CreateUserInput struct {
	AuthToken string `json:"auth_token"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Role      string `json:"role"`
}

func normalizeRole(raw string) (domainAuth.Role, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "admin":
		return domainAuth.RoleAdmin, nil
	case "operator", "dataentryoperator":
		return domainAuth.RoleDataEntryOperator, nil
	default:
		return "", fmt.Errorf("invalid role: %s", raw)
	}
}

func (a *App) Login(username, password string) (AuthTokenResult, error) {
	if !a.isServer && a.authService == nil {
		return loginOverNetwork(strings.TrimSpace(username), password)
	}
	if a.authService == nil {
		return AuthTokenResult{}, fmt.Errorf("auth service is not configured")
	}
	token, err := a.authService.Login(strings.TrimSpace(username), password)
	if err != nil {
		return AuthTokenResult{}, err
	}
	return AuthTokenResult{
		Token:     token.Token,
		ExpiresAt: token.ExpiresAt,
	}, nil
}

type sessionRoleResponse struct {
	Role string `json:"role"`
}

type authAPIErrorResponse struct {
	Message string `json:"message"`
}

func loginOverNetwork(username, password string) (AuthTokenResult, error) {
	req := map[string]string{
		"username": strings.TrimSpace(username),
		"password": password,
	}

	var result AuthTokenResult
	if err := postToServerAPI("/auth/login", req, &result); err != nil {
		return AuthTokenResult{}, err
	}

	if strings.TrimSpace(result.Token) == "" {
		return AuthTokenResult{}, fmt.Errorf("login did not return a session token")
	}
	return result, nil
}

func fetchSessionRoleOverNetwork(authToken string) (string, error) {
	req := map[string]string{
		"auth_token": strings.TrimSpace(authToken),
	}

	var response sessionRoleResponse
	if err := postToServerAPI("/auth/session-role", req, &response); err != nil {
		return "", err
	}
	role := strings.TrimSpace(response.Role)
	if role == "" {
		return "", fmt.Errorf("session role response is empty")
	}
	return role, nil
}

func postToServerAPI(path string, payload interface{}, output interface{}) error {
	baseURL := resolveServerAPIBaseURL()
	url := strings.TrimRight(baseURL, "/") + path

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: serverAPITimeout}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("server request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiErr authAPIErrorResponse
		if decodeErr := json.NewDecoder(resp.Body).Decode(&apiErr); decodeErr == nil {
			msg := strings.TrimSpace(apiErr.Message)
			if msg != "" {
				return fmt.Errorf("%s", msg)
			}
		}
		return fmt.Errorf("server request failed with status %d", resp.StatusCode)
	}

	if output == nil {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(output); err != nil {
		return fmt.Errorf("failed to decode server response: %w", err)
	}
	return nil
}

func resolveServerAPIBaseURL() string {
	raw := strings.TrimSpace(os.Getenv(envServerProbeAddr))
	if raw == "" {
		return "http://" + defaultServerProbeAddr
	}

	if strings.Contains(raw, "://") {
		parsed, err := url.Parse(raw)
		if err == nil && strings.TrimSpace(parsed.Host) != "" {
			scheme := parsed.Scheme
			if scheme == "" {
				scheme = "http"
			}
			return scheme + "://" + strings.TrimSpace(parsed.Host)
		}
	}

	return "http://" + raw
}

func (a *App) CreateUser(input CreateUserInput) error {
	if !a.isServer && a.authService == nil {
		return postToServerAPI("/admin/create-user", input, nil)
	}
	if a.authService == nil {
		return fmt.Errorf("auth service is not configured")
	}
	role, err := normalizeRole(input.Role)
	if err != nil {
		return err
	}
	return a.authService.CreateUser(
		strings.TrimSpace(input.AuthToken),
		strings.TrimSpace(input.Username),
		input.Password,
		role,
	)
}

type ItemMasterResult struct {
	ID           int64   `json:"id"`
	SKU          string  `json:"sku"`
	Name         string  `json:"name"`
	ItemType     string  `json:"item_type"`
	BaseUnit     string  `json:"base_unit"`
	ItemSubtype  string  `json:"item_subtype"`
	MinimumStock float64 `json:"minimum_stock"`
	IsActive     bool    `json:"is_active"`
	UpdatedAt    string  `json:"updated_at"`
}

type PackagingProfileResult struct {
	ID         int64                                         `json:"id"`
	Name       string                                        `json:"name"`
	PackMode   string                                        `json:"pack_mode"`
	IsActive   bool                                          `json:"is_active"`
	UpdatedAt  string                                        `json:"updated_at"`
	Components []appInventory.PackagingProfileComponentInput `json:"components"`
}

func (a *App) CreateItemMaster(input appInventory.CreateItemInput) (ItemMasterResult, error) {
	if !a.isServer && a.inventoryService == nil {
		var result ItemMasterResult
		if err := postToServerAPI("/inventory/items/create", input, &result); err != nil {
			return ItemMasterResult{}, err
		}
		return result, nil
	}
	if a.inventoryService == nil {
		return ItemMasterResult{}, fmt.Errorf("inventory service is not configured")
	}
	item, err := a.inventoryService.CreateItemMaster(input)
	if err != nil {
		return ItemMasterResult{}, err
	}
	return ItemMasterResult{
		ID:           item.ID,
		SKU:          item.SKU,
		Name:         item.Name,
		ItemType:     string(item.ItemType),
		BaseUnit:     item.BaseUnit,
		ItemSubtype:  item.ItemSubtype,
		MinimumStock: item.MinimumStock,
		IsActive:     item.IsActive,
		UpdatedAt:    item.UpdatedAt.Format(time.RFC3339Nano),
	}, nil
}

func (a *App) UpdateItemMaster(input appInventory.UpdateItemInput) (ItemMasterResult, error) {
	if !a.isServer && a.inventoryService == nil {
		var result ItemMasterResult
		if err := postToServerAPI("/inventory/items/update", input, &result); err != nil {
			return ItemMasterResult{}, err
		}
		return result, nil
	}
	if a.inventoryService == nil {
		return ItemMasterResult{}, fmt.Errorf("inventory service is not configured")
	}
	item, err := a.inventoryService.UpdateItemMaster(input)
	if err != nil {
		return ItemMasterResult{}, err
	}
	return ItemMasterResult{
		ID:           item.ID,
		SKU:          item.SKU,
		Name:         item.Name,
		ItemType:     string(item.ItemType),
		BaseUnit:     item.BaseUnit,
		ItemSubtype:  item.ItemSubtype,
		MinimumStock: item.MinimumStock,
		IsActive:     item.IsActive,
		UpdatedAt:    item.UpdatedAt.Format(time.RFC3339Nano),
	}, nil
}

func (a *App) ListItems(input appInventory.ListItemsInput) ([]ItemMasterResult, error) {
	if !a.isServer && a.inventoryService == nil {
		var result []ItemMasterResult
		if err := postToServerAPI("/inventory/items/list", input, &result); err != nil {
			return nil, err
		}
		return result, nil
	}
	if a.inventoryService == nil {
		return nil, fmt.Errorf("inventory service is not configured")
	}
	items, err := a.inventoryService.ListItems(input)
	if err != nil {
		return nil, err
	}
	result := make([]ItemMasterResult, 0, len(items))
	for _, item := range items {
		result = append(result, ItemMasterResult{
			ID:           item.ID,
			SKU:          item.SKU,
			Name:         item.Name,
			ItemType:     string(item.ItemType),
			BaseUnit:     item.BaseUnit,
			ItemSubtype:  item.ItemSubtype,
			MinimumStock: item.MinimumStock,
			IsActive:     item.IsActive,
			UpdatedAt:    item.UpdatedAt.Format(time.RFC3339Nano),
		})
	}
	return result, nil
}

func (a *App) CreatePackagingProfile(input appInventory.CreatePackagingProfileInput) (PackagingProfileResult, error) {
	if !a.isServer && a.inventoryService == nil {
		var result PackagingProfileResult
		if err := postToServerAPI("/inventory/packaging/create", input, &result); err != nil {
			return PackagingProfileResult{}, err
		}
		return result, nil
	}
	if a.inventoryService == nil {
		return PackagingProfileResult{}, fmt.Errorf("inventory service is not configured")
	}
	profile, err := a.inventoryService.CreatePackagingProfile(input)
	if err != nil {
		return PackagingProfileResult{}, err
	}

	components := make([]appInventory.PackagingProfileComponentInput, 0, len(profile.Components))
	for _, component := range profile.Components {
		components = append(components, appInventory.PackagingProfileComponentInput{
			PackingMaterialItemID: component.PackingMaterialItemID,
			QtyPerUnit:            component.QtyPerUnit,
		})
	}

	return PackagingProfileResult{
		ID:         profile.ID,
		Name:       profile.Name,
		PackMode:   profile.PackMode,
		IsActive:   profile.IsActive,
		UpdatedAt:  profile.UpdatedAt.Format(time.RFC3339Nano),
		Components: components,
	}, nil
}

func (a *App) ListPackagingProfiles(input appInventory.ListPackagingProfilesInput) ([]PackagingProfileResult, error) {
	if !a.isServer && a.inventoryService == nil {
		var result []PackagingProfileResult
		if err := postToServerAPI("/inventory/packaging/list", input, &result); err != nil {
			return nil, err
		}
		return result, nil
	}
	if a.inventoryService == nil {
		return nil, fmt.Errorf("inventory service is not configured")
	}
	profiles, err := a.inventoryService.ListPackagingProfiles(input)
	if err != nil {
		return nil, err
	}
	result := make([]PackagingProfileResult, 0, len(profiles))
	for _, profile := range profiles {
		components := make([]appInventory.PackagingProfileComponentInput, 0, len(profile.Components))
		for _, component := range profile.Components {
			components = append(components, appInventory.PackagingProfileComponentInput{
				PackingMaterialItemID: component.PackingMaterialItemID,
				QtyPerUnit:            component.QtyPerUnit,
			})
		}
		result = append(result, PackagingProfileResult{
			ID:         profile.ID,
			Name:       profile.Name,
			PackMode:   profile.PackMode,
			IsActive:   profile.IsActive,
			UpdatedAt:  profile.UpdatedAt.Format(time.RFC3339Nano),
			Components: components,
		})
	}
	return result, nil
}
