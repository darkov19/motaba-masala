package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"masala_inventory_managment/internal/app"
	appInventory "masala_inventory_managment/internal/app/inventory"
)

type stubServerAPIApplication struct {
	loginFn                  func(username, password string) (app.AuthTokenResult, error)
	getSessionRoleFn         func(authToken string) (string, error)
	createUserFn             func(input app.CreateUserInput) error
	createItemMasterFn       func(input appInventory.CreateItemInput) (app.ItemMasterResult, error)
	updateItemMasterFn       func(input appInventory.UpdateItemInput) (app.ItemMasterResult, error)
	listItemsFn              func(input appInventory.ListItemsInput) ([]app.ItemMasterResult, error)
	createPackagingProfileFn func(input appInventory.CreatePackagingProfileInput) (app.PackagingProfileResult, error)
	listPackagingProfilesFn  func(input appInventory.ListPackagingProfilesInput) ([]app.PackagingProfileResult, error)
}

func (s stubServerAPIApplication) Login(username, password string) (app.AuthTokenResult, error) {
	if s.loginFn != nil {
		return s.loginFn(username, password)
	}
	return app.AuthTokenResult{}, errors.New("not implemented")
}

func (s stubServerAPIApplication) GetSessionRole(authToken string) (string, error) {
	if s.getSessionRoleFn != nil {
		return s.getSessionRoleFn(authToken)
	}
	return "", errors.New("not implemented")
}

func (s stubServerAPIApplication) CreateUser(input app.CreateUserInput) error {
	if s.createUserFn != nil {
		return s.createUserFn(input)
	}
	return errors.New("not implemented")
}

func (s stubServerAPIApplication) CreateItemMaster(input appInventory.CreateItemInput) (app.ItemMasterResult, error) {
	if s.createItemMasterFn != nil {
		return s.createItemMasterFn(input)
	}
	return app.ItemMasterResult{}, errors.New("not implemented")
}

func (s stubServerAPIApplication) UpdateItemMaster(input appInventory.UpdateItemInput) (app.ItemMasterResult, error) {
	if s.updateItemMasterFn != nil {
		return s.updateItemMasterFn(input)
	}
	return app.ItemMasterResult{}, errors.New("not implemented")
}

func (s stubServerAPIApplication) ListItems(input appInventory.ListItemsInput) ([]app.ItemMasterResult, error) {
	if s.listItemsFn != nil {
		return s.listItemsFn(input)
	}
	return nil, errors.New("not implemented")
}

func (s stubServerAPIApplication) CreatePackagingProfile(input appInventory.CreatePackagingProfileInput) (app.PackagingProfileResult, error) {
	if s.createPackagingProfileFn != nil {
		return s.createPackagingProfileFn(input)
	}
	return app.PackagingProfileResult{}, errors.New("not implemented")
}

func (s stubServerAPIApplication) ListPackagingProfiles(input appInventory.ListPackagingProfilesInput) ([]app.PackagingProfileResult, error) {
	if s.listPackagingProfilesFn != nil {
		return s.listPackagingProfilesFn(input)
	}
	return nil, errors.New("not implemented")
}

func TestServerAPI_LoginSuccess(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		loginFn: func(username, password string) (app.AuthTokenResult, error) {
			if username != "admin" || password != "secret" {
				t.Fatalf("unexpected credentials: %s/%s", username, password)
			}
			return app.AuthTokenResult{Token: "token-123", ExpiresAt: 1893456000}, nil
		},
	})

	rec := postJSON(t, router, "/auth/login", map[string]string{
		"username": "admin",
		"password": "secret",
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var payload app.AuthTokenResult
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if payload.Token != "token-123" {
		t.Fatalf("expected token-123, got %q", payload.Token)
	}
}

func TestServerAPI_LoginInvalidCredentialsReturnsUnauthorized(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		loginFn: func(_, _ string) (app.AuthTokenResult, error) {
			return app.AuthTokenResult{}, errors.New("invalid credentials")
		},
	})

	rec := postJSON(t, router, "/auth/login", map[string]string{
		"username": "admin",
		"password": "wrong",
	})
	assertErrorStatusAndMessage(t, rec, http.StatusUnauthorized, "invalid credentials")
}

func TestServerAPI_CreateUserForbiddenReturnsForbidden(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		createUserFn: func(_ app.CreateUserInput) error {
			return errors.New("forbidden: insufficient permissions")
		},
	})

	rec := postJSON(t, router, "/admin/create-user", map[string]string{
		"auth_token": "operator-token",
		"username":   "new-user",
		"password":   "password",
		"role":       "operator",
	})
	assertErrorStatusAndMessage(t, rec, http.StatusForbidden, "forbidden: insufficient permissions")
}

func TestServerAPI_CreateItemValidationReturnsBadRequest(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		createItemMasterFn: func(_ appInventory.CreateItemInput) (app.ItemMasterResult, error) {
			return app.ItemMasterResult{}, &appInventory.ServiceError{
				Code:    "validation_failed",
				Message: "item validation failed",
			}
		},
	})

	rec := postJSON(t, router, "/inventory/items/create", map[string]interface{}{
		"name":       "",
		"item_type":  "RAW",
		"base_unit":  "kg",
		"auth_token": "admin-token",
	})
	assertErrorStatusAndMessage(t, rec, http.StatusBadRequest, "item validation failed")
}

func TestServerAPI_ListItemsUnauthorizedReturnsUnauthorized(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		listItemsFn: func(_ appInventory.ListItemsInput) ([]app.ItemMasterResult, error) {
			return nil, &appInventory.ServiceError{
				Code:    "unauthorized",
				Message: "invalid or expired authentication token",
			}
		},
	})

	rec := postJSON(t, router, "/inventory/items/list", map[string]interface{}{
		"active_only": true,
		"auth_token":  "stale-token",
	})
	assertErrorStatusAndMessage(t, rec, http.StatusUnauthorized, "invalid or expired authentication token")
}

func postJSON(t *testing.T, handler http.Handler, path string, payload interface{}) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func assertErrorStatusAndMessage(t *testing.T, rec *httptest.ResponseRecorder, expectedStatus int, expectedMessage string) {
	t.Helper()
	if rec.Code != expectedStatus {
		t.Fatalf("expected status %d, got %d (%s)", expectedStatus, rec.Code, rec.Body.String())
	}

	var payload serverErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if payload.Message != expectedMessage {
		t.Fatalf("expected message %q, got %q", expectedMessage, payload.Message)
	}
}
