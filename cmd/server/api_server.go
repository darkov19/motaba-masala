package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"masala_inventory_managment/internal/app"
	appInventory "masala_inventory_managment/internal/app/inventory"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	envServerAPIBindAddr     = "MASALA_SERVER_API_BIND_ADDR"
	defaultServerAPIBindAddr = "0.0.0.0:8090"
)

type serverLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type serverSessionRoleRequest struct {
	AuthToken string `json:"auth_token"`
}

type serverErrorResponse struct {
	Message string `json:"message"`
}

type serverAPIApplication interface {
	Login(username, password string) (app.AuthTokenResult, error)
	GetSessionRole(authToken string) (string, error)
	CreateUser(input app.CreateUserInput) error
	ListUsers(input app.ListUsersInput) ([]app.UserAccountResult, error)
	UpdateUserRole(input app.UpdateUserRoleInput) error
	SetUserActive(input app.SetUserActiveInput) error
	ResetUserPassword(input app.ResetUserPasswordInput) error
	DeleteUser(input app.DeleteUserInput) error
	CreateItemMaster(input appInventory.CreateItemInput) (app.ItemMasterResult, error)
	UpdateItemMaster(input appInventory.UpdateItemInput) (app.ItemMasterResult, error)
	ListItems(input appInventory.ListItemsInput) ([]app.ItemMasterResult, error)
	CreatePackagingProfile(input appInventory.CreatePackagingProfileInput) (app.PackagingProfileResult, error)
	ListPackagingProfiles(input appInventory.ListPackagingProfilesInput) ([]app.PackagingProfileResult, error)
	CreateRecipe(input appInventory.CreateRecipeInput) (app.RecipeResult, error)
	UpdateRecipe(input appInventory.UpdateRecipeInput) (app.RecipeResult, error)
	ListRecipes(input appInventory.ListRecipesInput) ([]app.RecipeResult, error)
	CreateParty(input appInventory.CreatePartyInput) (app.PartyResult, error)
	UpdateParty(input appInventory.UpdatePartyInput) (app.PartyResult, error)
	ListParties(input appInventory.ListPartiesInput) ([]app.PartyResult, error)
	ListMaterialLots(input appInventory.ListMaterialLotsInput) ([]app.MaterialLotResult, error)
	RecordLotStockMovement(input appInventory.RecordLotStockMovementInput) (app.LotStockMovementResult, error)
	ListLotStockMovements(input appInventory.ListLotStockMovementsInput) ([]app.LotStockMovementResult, error)
	CreateGRN(input appInventory.CreateGRNInput) (app.GRNResult, error)
	CreateUnitConversionRule(input appInventory.CreateUnitConversionRuleInput) (app.UnitConversionRuleResult, error)
	ListUnitConversionRules(input appInventory.ListUnitConversionRulesInput) ([]app.UnitConversionRuleResult, error)
	ConvertQuantity(input appInventory.ConvertQuantityInput) (app.UnitConversionResult, error)
	CreateStockAdjustment(input appInventory.CreateStockAdjustmentInput) (app.StockAdjustmentResult, error)
	ListStockAdjustments(input appInventory.ListStockAdjustmentsInput) ([]app.StockAdjustmentResult, error)
	GetItemStockBalance(input appInventory.GetItemStockBalanceInput) (float64, error)
}

func startServerAuthAPIServer(application serverAPIApplication) (func(), error) {
	router := buildServerAPIRouter(application)

	addr := resolveServerAPIBindAddr()
	server := &http.Server{
		Addr:              addr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		slog.Info("Starting server auth API", "addr", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server auth API stopped unexpectedly", "error", err)
		}
	}()

	stop := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			slog.Warn("Server auth API shutdown failed", "error", err)
		}
	}

	return stop, nil
}

func buildServerAPIRouter(application serverAPIApplication) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		writeServerJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req serverLoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.Login(req.Username, req.Password)
		if err != nil {
			writeMappedServerError(w, "Server auth API login failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/auth/session-role", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var req serverSessionRoleRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		role, err := application.GetSessionRole(req.AuthToken)
		if err != nil {
			writeMappedServerError(w, "Server auth API session role failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, map[string]string{"role": role})
	})

	mux.HandleFunc("/admin/create-user", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input app.CreateUserInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		if err := application.CreateUser(input); err != nil {
			writeMappedServerError(w, "Server admin create-user failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("/admin/users/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input app.ListUsersInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListUsers(input)
		if err != nil {
			writeMappedServerError(w, "Server admin list-users failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/admin/users/role", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input app.UpdateUserRoleInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		if err := application.UpdateUserRole(input); err != nil {
			writeMappedServerError(w, "Server admin update-user-role failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("/admin/users/active", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input app.SetUserActiveInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		if err := application.SetUserActive(input); err != nil {
			writeMappedServerError(w, "Server admin set-user-active failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("/admin/users/password-reset", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input app.ResetUserPasswordInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		if err := application.ResetUserPassword(input); err != nil {
			writeMappedServerError(w, "Server admin reset-user-password failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("/admin/users/delete", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input app.DeleteUserInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		if err := application.DeleteUser(input); err != nil {
			writeMappedServerError(w, "Server admin delete-user failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("/inventory/items/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.CreateItemInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.CreateItemMaster(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory create item failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/items/update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.UpdateItemInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.UpdateItemMaster(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory update item failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/items/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ListItemsInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListItems(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory list items failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/packaging/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.CreatePackagingProfileInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.CreatePackagingProfile(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory create packaging profile failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/packaging/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ListPackagingProfilesInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListPackagingProfiles(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory list packaging profiles failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/recipes/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.CreateRecipeInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.CreateRecipe(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory create recipe failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/recipes/update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.UpdateRecipeInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.UpdateRecipe(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory update recipe failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/recipes/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ListRecipesInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListRecipes(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory list recipes failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/parties/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.CreatePartyInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.CreateParty(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory create party failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/parties/update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.UpdatePartyInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.UpdateParty(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory update party failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/parties/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ListPartiesInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListParties(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory list parties failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/grns/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.CreateGRNInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.CreateGRN(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory create grn failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/lots/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ListMaterialLotsInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListMaterialLots(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory list lots failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/lots/movements/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.RecordLotStockMovementInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.RecordLotStockMovement(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory create lot movement failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/lots/movements/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ListLotStockMovementsInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListLotStockMovements(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory list lot movements failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/reconciliation/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.CreateStockAdjustmentInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.CreateStockAdjustment(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory create stock adjustment failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/reconciliation/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ListStockAdjustmentsInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListStockAdjustments(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory list stock adjustments failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/reconciliation/balance", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.GetItemStockBalanceInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.GetItemStockBalance(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory get item stock balance failed", err)
			return
		}
		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/conversions/rules/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.CreateUnitConversionRuleInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.CreateUnitConversionRule(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory create conversion rule failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/conversions/rules/list", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ListUnitConversionRulesInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ListUnitConversionRules(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory list conversion rules failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	mux.HandleFunc("/inventory/conversions/convert", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeServerError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		var input appInventory.ConvertQuantityInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeServerError(w, http.StatusBadRequest, "invalid request payload")
			return
		}

		result, err := application.ConvertQuantity(input)
		if err != nil {
			writeMappedServerError(w, "Server inventory convert quantity failed", err)
			return
		}

		writeServerJSON(w, http.StatusOK, result)
	})

	return mux
}

func writeServerJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		slog.Error("Failed to write API response", "error", err)
	}
}

func writeServerError(w http.ResponseWriter, status int, message string) {
	msg := strings.TrimSpace(message)
	if msg == "" {
		msg = fmt.Sprintf("request failed (status %d)", status)
	}
	writeServerJSON(w, status, serverErrorResponse{Message: msg})
}

func writeMappedServerError(w http.ResponseWriter, operation string, err error) {
	status, msg := mapHTTPStatusFromError(err)

	if status >= 500 {
		slog.Error(operation, "error", err)
	}
	writeServerError(w, status, msg)
}

func mapHTTPStatusFromError(err error) (int, string) {
	if err == nil {
		return http.StatusInternalServerError, ""
	}

	msg := strings.TrimSpace(err.Error())

	var inventoryErr *appInventory.ServiceError
	if errors.As(err, &inventoryErr) {
		switch strings.TrimSpace(strings.ToLower(inventoryErr.Code)) {
		case "unauthorized":
			return http.StatusUnauthorized, msg
		case "forbidden":
			return http.StatusForbidden, msg
		case "validation_failed":
			return http.StatusBadRequest, msg
		case "conflict":
			return http.StatusConflict, msg
		}
	}

	return mapHTTPStatus(msg), msg
}

func mapHTTPStatus(message string) int {
	msg := strings.ToLower(strings.TrimSpace(message))
	switch {
	case msg == "invalid credentials":
		return http.StatusUnauthorized
	case strings.HasPrefix(msg, "unauthorized:"),
		strings.Contains(msg, "unauthorized"),
		strings.Contains(msg, "invalid token"),
		strings.Contains(msg, "auth token"):
		return http.StatusUnauthorized
	case strings.HasPrefix(msg, "forbidden:"),
		strings.Contains(msg, "forbidden"),
		strings.Contains(msg, "not allowed"),
		strings.Contains(msg, "disabled"):
		return http.StatusForbidden
	case strings.Contains(msg, "read-only"), strings.Contains(msg, "license expired"):
		return http.StatusForbidden
	case strings.Contains(msg, "record modified"), strings.Contains(msg, "concurrency"):
		return http.StatusConflict
	case strings.Contains(msg, "validation"), strings.Contains(msg, "required"), strings.Contains(msg, "invalid "):
		return http.StatusBadRequest
	case strings.Contains(msg, "not found"):
		return http.StatusNotFound
	case strings.Contains(msg, "already exists"), strings.Contains(msg, "last active admin"), strings.Contains(msg, "cannot modify"):
		return http.StatusConflict
	case strings.Contains(msg, "cannot disable your own account"), strings.Contains(msg, "cannot delete your own account"):
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}

func resolveServerAPIBindAddr() string {
	raw := strings.TrimSpace(os.Getenv(envServerAPIBindAddr))
	if raw == "" {
		return defaultServerAPIBindAddr
	}
	return raw
}
