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
	listUsersFn              func(input app.ListUsersInput) ([]app.UserAccountResult, error)
	updateUserRoleFn         func(input app.UpdateUserRoleInput) error
	setUserActiveFn          func(input app.SetUserActiveInput) error
	resetUserPasswordFn      func(input app.ResetUserPasswordInput) error
	deleteUserFn             func(input app.DeleteUserInput) error
	createItemMasterFn       func(input appInventory.CreateItemInput) (app.ItemMasterResult, error)
	updateItemMasterFn       func(input appInventory.UpdateItemInput) (app.ItemMasterResult, error)
	listItemsFn              func(input appInventory.ListItemsInput) ([]app.ItemMasterResult, error)
	createPackagingProfileFn func(input appInventory.CreatePackagingProfileInput) (app.PackagingProfileResult, error)
	listPackagingProfilesFn  func(input appInventory.ListPackagingProfilesInput) ([]app.PackagingProfileResult, error)
	createRecipeFn           func(input appInventory.CreateRecipeInput) (app.RecipeResult, error)
	updateRecipeFn           func(input appInventory.UpdateRecipeInput) (app.RecipeResult, error)
	listRecipesFn            func(input appInventory.ListRecipesInput) ([]app.RecipeResult, error)
	createConversionRuleFn   func(input appInventory.CreateUnitConversionRuleInput) (app.UnitConversionRuleResult, error)
	listConversionRulesFn    func(input appInventory.ListUnitConversionRulesInput) ([]app.UnitConversionRuleResult, error)
	convertQuantityFn        func(input appInventory.ConvertQuantityInput) (app.UnitConversionResult, error)
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

func (s stubServerAPIApplication) ListUsers(input app.ListUsersInput) ([]app.UserAccountResult, error) {
	if s.listUsersFn != nil {
		return s.listUsersFn(input)
	}
	return nil, errors.New("not implemented")
}

func (s stubServerAPIApplication) UpdateUserRole(input app.UpdateUserRoleInput) error {
	if s.updateUserRoleFn != nil {
		return s.updateUserRoleFn(input)
	}
	return errors.New("not implemented")
}

func (s stubServerAPIApplication) SetUserActive(input app.SetUserActiveInput) error {
	if s.setUserActiveFn != nil {
		return s.setUserActiveFn(input)
	}
	return errors.New("not implemented")
}

func (s stubServerAPIApplication) ResetUserPassword(input app.ResetUserPasswordInput) error {
	if s.resetUserPasswordFn != nil {
		return s.resetUserPasswordFn(input)
	}
	return errors.New("not implemented")
}

func (s stubServerAPIApplication) DeleteUser(input app.DeleteUserInput) error {
	if s.deleteUserFn != nil {
		return s.deleteUserFn(input)
	}
	return errors.New("not implemented")
}

func (s stubServerAPIApplication) CreateItemMaster(input appInventory.CreateItemInput) (app.ItemMasterResult, error) {
	if s.createItemMasterFn != nil {
		return s.createItemMasterFn(input)
	}
	return app.ItemMasterResult{}, errors.New("not implemented")
}

func TestServerAPI_ListUsersSuccess(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		listUsersFn: func(input app.ListUsersInput) ([]app.UserAccountResult, error) {
			if input.AuthToken != "admin-token" {
				t.Fatalf("unexpected auth token: %s", input.AuthToken)
			}
			return []app.UserAccountResult{
				{Username: "admin", Role: "Admin", IsActive: true},
			}, nil
		},
	})

	rec := postJSON(t, router, "/admin/users/list", map[string]string{
		"auth_token": "admin-token",
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var payload []app.UserAccountResult
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(payload) != 1 || payload[0].Username != "admin" {
		t.Fatalf("unexpected response payload: %#v", payload)
	}
}

func TestServerAPI_DeleteUserNotFoundReturnsNotFound(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		deleteUserFn: func(_ app.DeleteUserInput) error {
			return errors.New("user not found")
		},
	})

	rec := postJSON(t, router, "/admin/users/delete", map[string]string{
		"auth_token": "admin-token",
		"username":   "ghost",
	})
	assertErrorStatusAndMessage(t, rec, http.StatusNotFound, "user not found")
}

func TestServerAPI_UpdateUserRoleDisabledReturnsForbidden(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		updateUserRoleFn: func(_ app.UpdateUserRoleInput) error {
			return errors.New("forbidden: role changes are disabled")
		},
	})

	rec := postJSON(t, router, "/admin/users/role", map[string]string{
		"auth_token": "admin-token",
		"username":   "operator",
		"role":       "admin",
	})
	assertErrorStatusAndMessage(t, rec, http.StatusForbidden, "forbidden: role changes are disabled")
}

func TestServerAPI_SetUserActiveSelfGuardReturnsConflict(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		setUserActiveFn: func(_ app.SetUserActiveInput) error {
			return errors.New("cannot disable your own account")
		},
	})

	rec := postJSON(t, router, "/admin/users/active", map[string]interface{}{
		"auth_token": "admin-token",
		"username":   "admin",
		"is_active":  false,
	})
	assertErrorStatusAndMessage(t, rec, http.StatusConflict, "cannot disable your own account")
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

func (s stubServerAPIApplication) CreateRecipe(input appInventory.CreateRecipeInput) (app.RecipeResult, error) {
	if s.createRecipeFn != nil {
		return s.createRecipeFn(input)
	}
	return app.RecipeResult{}, errors.New("not implemented")
}

func (s stubServerAPIApplication) UpdateRecipe(input appInventory.UpdateRecipeInput) (app.RecipeResult, error) {
	if s.updateRecipeFn != nil {
		return s.updateRecipeFn(input)
	}
	return app.RecipeResult{}, errors.New("not implemented")
}

func (s stubServerAPIApplication) ListRecipes(input appInventory.ListRecipesInput) ([]app.RecipeResult, error) {
	if s.listRecipesFn != nil {
		return s.listRecipesFn(input)
	}
	return nil, errors.New("not implemented")
}

func (s stubServerAPIApplication) CreateUnitConversionRule(input appInventory.CreateUnitConversionRuleInput) (app.UnitConversionRuleResult, error) {
	if s.createConversionRuleFn != nil {
		return s.createConversionRuleFn(input)
	}
	return app.UnitConversionRuleResult{}, errors.New("not implemented")
}

func (s stubServerAPIApplication) ListUnitConversionRules(input appInventory.ListUnitConversionRulesInput) ([]app.UnitConversionRuleResult, error) {
	if s.listConversionRulesFn != nil {
		return s.listConversionRulesFn(input)
	}
	return nil, errors.New("not implemented")
}

func (s stubServerAPIApplication) ConvertQuantity(input appInventory.ConvertQuantityInput) (app.UnitConversionResult, error) {
	if s.convertQuantityFn != nil {
		return s.convertQuantityFn(input)
	}
	return app.UnitConversionResult{}, errors.New("not implemented")
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

func TestServerAPI_ConvertQuantityMissingRuleReturnsBadRequest(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		convertQuantityFn: func(_ appInventory.ConvertQuantityInput) (app.UnitConversionResult, error) {
			return app.UnitConversionResult{}, &appInventory.ServiceError{
				Code:    "validation_failed",
				Message: "conversion rule not found for requested unit pair",
			}
		},
	})

	rec := postJSON(t, router, "/inventory/conversions/convert", map[string]interface{}{
		"quantity":    500,
		"source_unit": "GRAM",
		"target_unit": "KG",
		"auth_token":  "admin-token",
	})
	assertErrorStatusAndMessage(t, rec, http.StatusBadRequest, "conversion rule not found for requested unit pair")
}

func TestServerAPI_CreateRecipeSuccess(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		createRecipeFn: func(input appInventory.CreateRecipeInput) (app.RecipeResult, error) {
			if input.RecipeCode != "RCP-GM-1" || input.OutputItemID != 20 || input.AuthToken != "admin-token" {
				t.Fatalf("unexpected create recipe input: %+v", input)
			}
			return app.RecipeResult{
				ID:                 200,
				RecipeCode:         "RCP-GM-1",
				OutputItemID:       20,
				OutputQtyBase:      100,
				ExpectedWastagePct: 2.5,
				IsActive:           true,
				Components: []app.RecipeComponentResult{
					{InputItemID: 1, InputQtyBase: 60, LineNo: 1},
				},
			}, nil
		},
	})

	rec := postJSON(t, router, "/inventory/recipes/create", map[string]interface{}{
		"recipe_code":          "RCP-GM-1",
		"output_item_id":       20,
		"output_qty_base":      100,
		"expected_wastage_pct": 2.5,
		"is_active":            true,
		"auth_token":           "admin-token",
		"components":           []map[string]interface{}{{"input_item_id": 1, "input_qty_base": 60, "line_no": 1}},
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var payload app.RecipeResult
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if payload.ID != 200 || payload.RecipeCode != "RCP-GM-1" {
		t.Fatalf("unexpected response payload: %#v", payload)
	}
}

func TestServerAPI_UpdateRecipeConflictReturnsConflict(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		updateRecipeFn: func(_ appInventory.UpdateRecipeInput) (app.RecipeResult, error) {
			return app.RecipeResult{}, errors.New("Record modified by another user. Reload required.")
		},
	})

	rec := postJSON(t, router, "/inventory/recipes/update", map[string]interface{}{
		"id":                   200,
		"recipe_code":          "RCP-GM-1",
		"output_item_id":       20,
		"output_qty_base":      110,
		"expected_wastage_pct": 2.0,
		"updated_at":           "2026-02-26T10:00:00Z",
		"is_active":            true,
		"auth_token":           "admin-token",
		"components":           []map[string]interface{}{{"input_item_id": 1, "input_qty_base": 70, "line_no": 1}},
	})
	assertErrorStatusAndMessage(t, rec, http.StatusConflict, "Record modified by another user. Reload required.")
}

func TestServerAPI_UpdateRecipeSuccess(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		updateRecipeFn: func(input appInventory.UpdateRecipeInput) (app.RecipeResult, error) {
			if input.ID != 200 || input.RecipeCode != "RCP-GM-1" || input.AuthToken != "admin-token" {
				t.Fatalf("unexpected update recipe input: %+v", input)
			}
			return app.RecipeResult{
				ID:                 200,
				RecipeCode:         "RCP-GM-1",
				OutputItemID:       20,
				OutputQtyBase:      110,
				ExpectedWastagePct: 2,
				IsActive:           true,
				UpdatedAt:          "2026-02-26T10:01:00Z",
				Components: []app.RecipeComponentResult{
					{InputItemID: 1, InputQtyBase: 70, LineNo: 1},
				},
			}, nil
		},
	})

	rec := postJSON(t, router, "/inventory/recipes/update", map[string]interface{}{
		"id":                   200,
		"recipe_code":          "RCP-GM-1",
		"output_item_id":       20,
		"output_qty_base":      110,
		"expected_wastage_pct": 2.0,
		"updated_at":           "2026-02-26T10:00:00Z",
		"is_active":            true,
		"auth_token":           "admin-token",
		"components":           []map[string]interface{}{{"input_item_id": 1, "input_qty_base": 70, "line_no": 1}},
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var payload app.RecipeResult
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if payload.ID != 200 || payload.OutputQtyBase != 110 || len(payload.Components) != 1 {
		t.Fatalf("unexpected response payload: %#v", payload)
	}
}

func TestServerAPI_ListRecipesUnauthorizedReturnsUnauthorized(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		listRecipesFn: func(_ appInventory.ListRecipesInput) ([]app.RecipeResult, error) {
			return nil, &appInventory.ServiceError{
				Code:    "unauthorized",
				Message: "invalid or expired authentication token",
			}
		},
	})

	rec := postJSON(t, router, "/inventory/recipes/list", map[string]interface{}{
		"active_only": true,
		"auth_token":  "stale-token",
	})
	assertErrorStatusAndMessage(t, rec, http.StatusUnauthorized, "invalid or expired authentication token")
}

func TestServerAPI_ListRecipesSuccess(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		listRecipesFn: func(input appInventory.ListRecipesInput) ([]app.RecipeResult, error) {
			if input.ActiveOnly != true || input.Search != "RCP" || input.AuthToken != "admin-token" {
				t.Fatalf("unexpected list recipes input: %+v", input)
			}
			return []app.RecipeResult{
				{
					ID:                 200,
					RecipeCode:         "RCP-GM-1",
					OutputItemID:       20,
					OutputQtyBase:      100,
					ExpectedWastagePct: 2.5,
					IsActive:           true,
					UpdatedAt:          "2026-02-26T10:00:00Z",
					Components: []app.RecipeComponentResult{
						{InputItemID: 1, InputQtyBase: 60, LineNo: 1},
					},
				},
			}, nil
		},
	})

	rec := postJSON(t, router, "/inventory/recipes/list", map[string]interface{}{
		"active_only": true,
		"search":      "RCP",
		"auth_token":  "admin-token",
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var payload []app.RecipeResult
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(payload) != 1 || payload[0].RecipeCode != "RCP-GM-1" || len(payload[0].Components) != 1 {
		t.Fatalf("unexpected response payload: %#v", payload)
	}
}

func TestServerAPI_CreateUnitConversionRuleSuccess(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		createConversionRuleFn: func(input appInventory.CreateUnitConversionRuleInput) (app.UnitConversionRuleResult, error) {
			if input.FromUnit != "GRAM" || input.ToUnit != "KG" || input.AuthToken != "admin-token" {
				t.Fatalf("unexpected create conversion input: %+v", input)
			}
			return app.UnitConversionRuleResult{
				ID:             10,
				FromUnit:       "GRAM",
				ToUnit:         "KG",
				Factor:         0.001,
				PrecisionScale: 4,
				RoundingMode:   "HALF_UP",
				IsActive:       true,
			}, nil
		},
	})

	rec := postJSON(t, router, "/inventory/conversions/rules/create", map[string]interface{}{
		"from_unit":       "GRAM",
		"to_unit":         "KG",
		"factor":          0.001,
		"precision_scale": 4,
		"rounding_mode":   "HALF_UP",
		"auth_token":      "admin-token",
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var payload app.UnitConversionRuleResult
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if payload.ID != 10 || payload.FromUnit != "GRAM" || payload.ToUnit != "KG" {
		t.Fatalf("unexpected response payload: %#v", payload)
	}
}

func TestServerAPI_ListUnitConversionRulesSuccess(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		listConversionRulesFn: func(input appInventory.ListUnitConversionRulesInput) ([]app.UnitConversionRuleResult, error) {
			if input.FromUnit != "GRAM" || input.ToUnit != "KG" || input.AuthToken != "admin-token" {
				t.Fatalf("unexpected list conversion input: %+v", input)
			}
			return []app.UnitConversionRuleResult{
				{
					ID:             11,
					FromUnit:       "GRAM",
					ToUnit:         "KG",
					Factor:         0.001,
					PrecisionScale: 4,
					RoundingMode:   "HALF_UP",
					IsActive:       true,
				},
			}, nil
		},
	})

	rec := postJSON(t, router, "/inventory/conversions/rules/list", map[string]interface{}{
		"from_unit":   "GRAM",
		"to_unit":     "KG",
		"active_only": true,
		"auth_token":  "admin-token",
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var payload []app.UnitConversionRuleResult
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(payload) != 1 || payload[0].ID != 11 {
		t.Fatalf("unexpected response payload: %#v", payload)
	}
}

func TestServerAPI_ConvertQuantitySuccess(t *testing.T) {
	router := buildServerAPIRouter(stubServerAPIApplication{
		convertQuantityFn: func(input appInventory.ConvertQuantityInput) (app.UnitConversionResult, error) {
			if input.Quantity != 500 || input.SourceUnit != "GRAM" || input.TargetUnit != "KG" || input.AuthToken != "admin-token" {
				t.Fatalf("unexpected convert quantity input: %+v", input)
			}
			return app.UnitConversionResult{
				QtyConverted: 0.5,
				SourceUnit:   "GRAM",
				TargetUnit:   "KG",
				Factor:       0.001,
			}, nil
		},
	})

	rec := postJSON(t, router, "/inventory/conversions/convert", map[string]interface{}{
		"quantity":    500,
		"source_unit": "GRAM",
		"target_unit": "KG",
		"auth_token":  "admin-token",
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	var payload app.UnitConversionResult
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if payload.QtyConverted != 0.5 || payload.SourceUnit != "GRAM" || payload.TargetUnit != "KG" {
		t.Fatalf("unexpected response payload: %#v", payload)
	}
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
