package inventory

import (
	"encoding/json"
	"errors"
	"testing"

	appLicenseMode "masala_inventory_managment/internal/app/licensemode"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	domainErrors "masala_inventory_managment/internal/domain/errors"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
)

type fakeInventoryRepo struct {
	createItemErr       error
	createBatchErr      error
	createGRNErr        error
	updateItemErr       error
	updateBatchErr      error
	updateGRNErr        error
	createRecipeErr     error
	updateRecipeErr     error
	createPartyErr      error
	updatePartyErr      error
	createConversionErr error
	findConversionErr   error
	items               []domainInventory.Item
	profiles            []domainInventory.PackagingProfile
	recipes             []domainInventory.Recipe
	parties             []domainInventory.Party
	conversionRules     []domainInventory.UnitConversionRule
	lastCreatedGRN      *domainInventory.GRN
}

func (f *fakeInventoryRepo) CreateItem(*domainInventory.Item) error   { return f.createItemErr }
func (f *fakeInventoryRepo) CreateBatch(*domainInventory.Batch) error { return f.createBatchErr }
func (f *fakeInventoryRepo) CreateGRN(grn *domainInventory.GRN) error {
	if f.createGRNErr != nil {
		return f.createGRNErr
	}
	if grn != nil {
		copyGRN := *grn
		copyGRN.Lines = append([]domainInventory.GRNLine(nil), grn.Lines...)
		f.lastCreatedGRN = &copyGRN
		grn.ID = 1
	}
	return nil
}

func (f *fakeInventoryRepo) UpdateItem(*domainInventory.Item) error   { return f.updateItemErr }
func (f *fakeInventoryRepo) UpdateBatch(*domainInventory.Batch) error { return f.updateBatchErr }
func (f *fakeInventoryRepo) UpdateGRN(*domainInventory.GRN) error     { return f.updateGRNErr }
func (f *fakeInventoryRepo) ListItems(domainInventory.ItemListFilter) ([]domainInventory.Item, error) {
	return f.items, nil
}
func (f *fakeInventoryRepo) CreatePackagingProfile(*domainInventory.PackagingProfile) error {
	return nil
}
func (f *fakeInventoryRepo) ListPackagingProfiles(domainInventory.PackagingProfileListFilter) ([]domainInventory.PackagingProfile, error) {
	return f.profiles, nil
}
func (f *fakeInventoryRepo) CreateRecipe(recipe *domainInventory.Recipe) error {
	if f.createRecipeErr != nil {
		return f.createRecipeErr
	}
	copyRecipe := *recipe
	copyRecipe.ID = int64(len(f.recipes) + 1)
	copyRecipe.Components = append([]domainInventory.RecipeComponent(nil), recipe.Components...)
	f.recipes = append(f.recipes, copyRecipe)
	recipe.ID = copyRecipe.ID
	return nil
}
func (f *fakeInventoryRepo) UpdateRecipe(recipe *domainInventory.Recipe) error {
	if f.updateRecipeErr != nil {
		return f.updateRecipeErr
	}
	for i := range f.recipes {
		if f.recipes[i].ID == recipe.ID {
			copyRecipe := *recipe
			copyRecipe.Components = append([]domainInventory.RecipeComponent(nil), recipe.Components...)
			f.recipes[i] = copyRecipe
			return nil
		}
	}
	return domainErrors.ErrConcurrencyConflict
}
func (f *fakeInventoryRepo) ListRecipes(domainInventory.RecipeListFilter) ([]domainInventory.Recipe, error) {
	return f.recipes, nil
}
func (f *fakeInventoryRepo) CreateParty(party *domainInventory.Party) error {
	if f.createPartyErr != nil {
		return f.createPartyErr
	}
	copyParty := *party
	copyParty.ID = int64(len(f.parties) + 1)
	f.parties = append(f.parties, copyParty)
	party.ID = copyParty.ID
	return nil
}
func (f *fakeInventoryRepo) UpdateParty(party *domainInventory.Party) error {
	if f.updatePartyErr != nil {
		return f.updatePartyErr
	}
	for i := range f.parties {
		if f.parties[i].ID == party.ID {
			f.parties[i] = *party
			return nil
		}
	}
	return domainErrors.ErrConcurrencyConflict
}
func (f *fakeInventoryRepo) ListParties(domainInventory.PartyListFilter) ([]domainInventory.Party, error) {
	return f.parties, nil
}
func (f *fakeInventoryRepo) CreateUnitConversionRule(rule *domainInventory.UnitConversionRule) error {
	if f.createConversionErr != nil {
		return f.createConversionErr
	}
	copyRule := *rule
	copyRule.ID = int64(len(f.conversionRules) + 1)
	f.conversionRules = append(f.conversionRules, copyRule)
	rule.ID = copyRule.ID
	return nil
}
func (f *fakeInventoryRepo) FindUnitConversionRule(lookup domainInventory.UnitConversionLookup) (*domainInventory.UnitConversionRule, error) {
	if f.findConversionErr != nil {
		return nil, f.findConversionErr
	}
	if err := lookup.Validate(); err != nil {
		return nil, err
	}
	for i := range f.conversionRules {
		rule := f.conversionRules[i]
		if !rule.IsActive {
			continue
		}
		if lookup.ItemID != nil && rule.ItemID != nil && *lookup.ItemID == *rule.ItemID &&
			rule.FromUnit == lookup.FromUnit && rule.ToUnit == lookup.ToUnit {
			copyRule := rule
			return &copyRule, nil
		}
	}
	for i := range f.conversionRules {
		rule := f.conversionRules[i]
		if !rule.IsActive || rule.ItemID != nil {
			continue
		}
		if rule.FromUnit == lookup.FromUnit && rule.ToUnit == lookup.ToUnit {
			copyRule := rule
			return &copyRule, nil
		}
	}
	return nil, domainInventory.ErrConversionRuleNotFound
}
func (f *fakeInventoryRepo) ListUnitConversionRules(domainInventory.UnitConversionRuleFilter) ([]domainInventory.UnitConversionRule, error) {
	return f.conversionRules, nil
}

func fixedRoleResolver(role domainAuth.Role, err error) func(string) (domainAuth.Role, error) {
	return func(_ string) (domainAuth.Role, error) {
		return role, err
	}
}

func TestService_UpdateItem_MapsConcurrencyError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{updateItemErr: domainErrors.ErrConcurrencyConflict}, nil)

	err := svc.UpdateItem(&domainInventory.Item{ID: 1})
	if err == nil || err.Error() != ErrRecordModified {
		t.Fatalf("expected %q, got %v", ErrRecordModified, err)
	}
}

func TestService_UpdateBatch_MapsConcurrencyError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{updateBatchErr: domainErrors.ErrConcurrencyConflict}, nil)

	err := svc.UpdateBatch(&domainInventory.Batch{ID: 1})
	if err == nil || err.Error() != ErrRecordModified {
		t.Fatalf("expected %q, got %v", ErrRecordModified, err)
	}
}

func TestService_UpdateGRN_MapsConcurrencyError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{updateGRNErr: domainErrors.ErrConcurrencyConflict}, nil)

	err := svc.UpdateGRN(&domainInventory.GRN{ID: 1})
	if err == nil || err.Error() != ErrRecordModified {
		t.Fatalf("expected %q, got %v", ErrRecordModified, err)
	}
}

func TestService_UpdateItem_PassesThroughNonConcurrencyErrors(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	expected := errors.New("db unavailable")
	svc := NewService(&fakeInventoryRepo{updateItemErr: expected}, nil)

	err := svc.UpdateItem(&domainInventory.Item{ID: 1})
	if !errors.Is(err, expected) {
		t.Fatalf("expected passthrough error %v, got %v", expected, err)
	}
}

func TestService_UpdateItem_BlockedInReadOnlyGracePeriod(t *testing.T) {
	t.Cleanup(func() {
		appLicenseMode.SetWriteEnforcer(nil)
	})
	appLicenseMode.SetWriteEnforcer(func() error {
		return appLicenseMode.ErrReadOnlyMode
	})
	svc := NewService(&fakeInventoryRepo{}, nil)

	err := svc.UpdateItem(&domainInventory.Item{ID: 1})
	if !errors.Is(err, appLicenseMode.ErrReadOnlyMode) {
		t.Fatalf("expected read-only error, got %v", err)
	}
}

func TestService_CreateBatch_BlockedInReadOnlyGracePeriod(t *testing.T) {
	t.Cleanup(func() {
		appLicenseMode.SetWriteEnforcer(nil)
	})
	appLicenseMode.SetWriteEnforcer(func() error {
		return appLicenseMode.ErrReadOnlyMode
	})
	svc := NewService(&fakeInventoryRepo{}, nil)

	err := svc.CreateBatch(&domainInventory.Batch{ID: 1})
	if !errors.Is(err, appLicenseMode.ErrReadOnlyMode) {
		t.Fatalf("expected read-only error, got %v", err)
	}
}

func TestService_CreateGRN_PassesThroughRepoErrors(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	expected := errors.New("db unavailable")
	svc := NewService(&fakeInventoryRepo{createGRNErr: expected}, nil)

	err := svc.CreateGRN(&domainInventory.GRN{ID: 1})
	if !errors.Is(err, expected) {
		t.Fatalf("expected passthrough error %v, got %v", expected, err)
	}
}

func TestService_CreateGRNRecord_ValidationErrorPayload(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.CreateGRNRecord(CreateGRNInput{
		GRNNumber:    "GRN-3001",
		SupplierName: "Acme Supplier",
		AuthToken:    "admin-token",
		Lines: []GRNLineInput{
			{ItemID: 10, QuantityReceived: 0},
		},
	})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %s", typed.Code)
	}
}

func TestService_CreateGRNRecord_NegativeQuantityValidationError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.CreateGRNRecord(CreateGRNInput{
		GRNNumber:    "GRN-3001",
		SupplierName: "Acme Supplier",
		AuthToken:    "admin-token",
		Lines: []GRNLineInput{
			{ItemID: 10, QuantityReceived: -2},
		},
	})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %s", typed.Code)
	}
	if len(typed.Fields) == 0 || typed.Fields[0].Field != "lines.quantity_received" {
		t.Fatalf("expected lines.quantity_received field error, got %+v", typed.Fields)
	}
}

func TestService_CreateGRNRecord_OperatorAllowed(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	repo := &fakeInventoryRepo{}
	svc := NewService(repo, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	_, err := svc.CreateGRNRecord(CreateGRNInput{
		GRNNumber:    "GRN-3001",
		SupplierName: "Acme Supplier",
		InvoiceNo:    "INV-3001",
		Notes:        "Dock receipt",
		AuthToken:    "operator-token",
		Lines: []GRNLineInput{
			{ItemID: 10, QuantityReceived: 40},
			{ItemID: 20, QuantityReceived: 15},
		},
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if repo.lastCreatedGRN == nil || len(repo.lastCreatedGRN.Lines) != 2 {
		t.Fatalf("expected grn lines to be persisted through repo, got %+v", repo.lastCreatedGRN)
	}
	if repo.lastCreatedGRN.Lines[0].LineNo != 1 || repo.lastCreatedGRN.Lines[1].LineNo != 2 {
		t.Fatalf("expected sequential line numbers, got %+v", repo.lastCreatedGRN.Lines)
	}
}

func TestService_CreateGRNRecord_UnauthorizedWithoutToken(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.CreateGRNRecord(CreateGRNInput{
		GRNNumber:    "GRN-3001",
		SupplierName: "Acme Supplier",
		Lines: []GRNLineInput{
			{ItemID: 10, QuantityReceived: 1},
		},
	})
	if err == nil {
		t.Fatalf("expected unauthorized error")
	}
	typed, ok := err.(*ServiceError)
	if !ok || typed.Code != "unauthorized" {
		t.Fatalf("expected unauthorized ServiceError, got %v", err)
	}
}

func TestService_CreateGRNRecord_ForbiddenRole(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.Role("Viewer"), nil))

	_, err := svc.CreateGRNRecord(CreateGRNInput{
		GRNNumber:    "GRN-3001",
		SupplierName: "Acme Supplier",
		AuthToken:    "viewer-token",
		Lines: []GRNLineInput{
			{ItemID: 10, QuantityReceived: 1},
		},
	})
	if err == nil {
		t.Fatalf("expected forbidden error")
	}
	typed, ok := err.(*ServiceError)
	if !ok || typed.Code != "forbidden" {
		t.Fatalf("expected forbidden ServiceError, got %v", err)
	}
}

func TestService_CreateGRNRecord_BlockedInReadOnlyGracePeriod(t *testing.T) {
	t.Cleanup(func() {
		appLicenseMode.SetWriteEnforcer(nil)
	})
	appLicenseMode.SetWriteEnforcer(func() error {
		return appLicenseMode.ErrReadOnlyMode
	})
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.CreateGRNRecord(CreateGRNInput{
		GRNNumber:    "GRN-3001",
		SupplierName: "Acme Supplier",
		AuthToken:    "admin-token",
		Lines: []GRNLineInput{
			{ItemID: 10, QuantityReceived: 1},
		},
	})
	if !errors.Is(err, appLicenseMode.ErrReadOnlyMode) {
		t.Fatalf("expected read-only error, got %v", err)
	}
}

func TestService_CreateItemMaster_ValidationErrorPayload(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.CreateItemMaster(CreateItemInput{
		Name:      "Invalid Type",
		ItemType:  "INVALID",
		BaseUnit:  "kg",
		AuthToken: "valid-token",
	})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %s", typed.Code)
	}
	if len(typed.Fields) == 0 || typed.Fields[0].Field != "item_type" {
		t.Fatalf("expected item_type field error, got %+v", typed.Fields)
	}
}

func TestService_ListItems_ForbiddenRole(t *testing.T) {
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.Role("Viewer"), nil))
	_, err := svc.ListItems(ListItemsInput{AuthToken: "viewer-token"})
	if err == nil {
		t.Fatalf("expected forbidden error")
	}
	typed, ok := err.(*ServiceError)
	if !ok || typed.Code != "forbidden" {
		t.Fatalf("expected forbidden service error, got %v", err)
	}
}

func TestService_CreatePackagingProfile_RequiresComponents(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))
	_, err := svc.CreatePackagingProfile(CreatePackagingProfileInput{
		Name:      "Jar Pack",
		PackMode:  "JAR_200G",
		AuthToken: "valid-token",
	})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %s", typed.Code)
	}
}

func TestService_CreateItemMaster_MissingTokenUnauthorized(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))
	_, err := svc.CreateItemMaster(CreateItemInput{
		Name:     "No Token",
		ItemType: "RAW",
		BaseUnit: "kg",
	})
	if err == nil {
		t.Fatalf("expected unauthorized error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "unauthorized" {
		t.Fatalf("expected unauthorized, got %s", typed.Code)
	}
}

func TestService_CreateItemMaster_ForgedActorRolePayloadIgnored(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	var input CreateItemInput
	if err := json.Unmarshal(
		[]byte(`{"name":"Forged","item_type":"RAW","base_unit":"kg","actor_role":"ADMIN"}`),
		&input,
	); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	_, err := svc.CreateItemMaster(input)
	if err == nil {
		t.Fatalf("expected unauthorized error because auth_token is missing")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "unauthorized" {
		t.Fatalf("expected unauthorized, got %s", typed.Code)
	}
}

func TestService_CreateItemMaster_OperatorDeniedByBackend(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	_, err := svc.CreateItemMaster(CreateItemInput{
		Name:      "Operator Attempt",
		ItemType:  "RAW",
		BaseUnit:  "kg",
		AuthToken: "operator-token",
	})
	if err == nil {
		t.Fatalf("expected forbidden error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "forbidden" {
		t.Fatalf("expected forbidden, got %s", typed.Code)
	}
}

func TestService_CreatePackagingProfile_OperatorDeniedByBackend(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	_, err := svc.CreatePackagingProfile(CreatePackagingProfileInput{
		Name:      "Operator Pack",
		PackMode:  "JAR_200G",
		AuthToken: "operator-token",
		Components: []PackagingProfileComponentInput{
			{PackingMaterialItemID: 10, QtyPerUnit: 1},
		},
	})
	if err == nil {
		t.Fatalf("expected forbidden error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "forbidden" {
		t.Fatalf("expected forbidden, got %s", typed.Code)
	}
}

func TestService_CreateUnitConversionRule_OperatorDeniedByBackend(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	_, err := svc.CreateUnitConversionRule(CreateUnitConversionRuleInput{
		FromUnit:       "GRAM",
		ToUnit:         "KG",
		Factor:         0.001,
		PrecisionScale: 4,
		RoundingMode:   "HALF_UP",
		AuthToken:      "operator-token",
	})
	if err == nil {
		t.Fatalf("expected forbidden error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "forbidden" {
		t.Fatalf("expected forbidden, got %s", typed.Code)
	}
}

func TestService_CreateRecipe_ValidationErrorPayload(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.CreateRecipe(CreateRecipeInput{
		RecipeCode:         "RCP-1",
		OutputItemID:       10,
		OutputQtyBase:      100,
		ExpectedWastagePct: 101,
		AuthToken:          "admin-token",
		Components: []RecipeComponentInput{
			{InputItemID: 1, InputQtyBase: 50, LineNo: 1},
		},
	})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %s", typed.Code)
	}
	if len(typed.Fields) == 0 || typed.Fields[0].Field != "expected_wastage_pct" {
		t.Fatalf("expected expected_wastage_pct field error, got %+v", typed.Fields)
	}
}

func TestService_CreateRecipe_OperatorDeniedByBackend(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	_, err := svc.CreateRecipe(CreateRecipeInput{
		RecipeCode:         "RCP-2",
		OutputItemID:       10,
		OutputQtyBase:      100,
		ExpectedWastagePct: 2.5,
		AuthToken:          "operator-token",
		Components: []RecipeComponentInput{
			{InputItemID: 1, InputQtyBase: 50, LineNo: 1},
		},
	})
	if err == nil {
		t.Fatalf("expected forbidden error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "forbidden" {
		t.Fatalf("expected forbidden, got %s", typed.Code)
	}
}

func TestService_UpdateRecipe_MapsConcurrencyError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{updateRecipeErr: domainErrors.ErrConcurrencyConflict}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.UpdateRecipe(UpdateRecipeInput{
		ID:                 1,
		RecipeCode:         "RCP-3",
		OutputItemID:       10,
		OutputQtyBase:      100,
		ExpectedWastagePct: 2,
		UpdatedAt:          "2026-02-26T12:00:00Z",
		AuthToken:          "admin-token",
		Components: []RecipeComponentInput{
			{InputItemID: 1, InputQtyBase: 50, LineNo: 1},
		},
	})
	if err == nil || err.Error() != ErrRecordModified {
		t.Fatalf("expected %q, got %v", ErrRecordModified, err)
	}
}

func TestService_ListRecipes_ReadAllowedForOperator(t *testing.T) {
	svc := NewService(&fakeInventoryRepo{
		recipes: []domainInventory.Recipe{
			{ID: 1, RecipeCode: "RCP-1", OutputItemID: 10, OutputQtyBase: 100, ExpectedWastagePct: 2},
		},
	}, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	result, err := svc.ListRecipes(ListRecipesInput{AuthToken: "operator-token", ActiveOnly: true})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(result) != 1 || result[0].RecipeCode != "RCP-1" {
		t.Fatalf("unexpected recipes payload: %+v", result)
	}
}

func TestService_CreateParty_ValidationErrorPayload(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.CreateParty(CreatePartyInput{
		PartyType: "SUPPLIER",
		Name:      "Acme Supplier",
		AuthToken: "admin-token",
	})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %s", typed.Code)
	}
	if len(typed.Fields) == 0 || typed.Fields[0].Field != "contact" {
		t.Fatalf("expected contact field error, got %+v", typed.Fields)
	}
}

func TestService_CreateParty_OperatorDeniedByBackend(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	_, err := svc.CreateParty(CreatePartyInput{
		PartyType: "SUPPLIER",
		Name:      "Acme Supplier",
		Phone:     "9998887777",
		AuthToken: "operator-token",
	})
	if err == nil {
		t.Fatalf("expected forbidden error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "forbidden" {
		t.Fatalf("expected forbidden, got %s", typed.Code)
	}
}

func TestService_ListParties_ReadAllowedForOperator(t *testing.T) {
	svc := NewService(&fakeInventoryRepo{
		parties: []domainInventory.Party{
			{ID: 1, PartyType: domainInventory.PartyTypeSupplier, Name: "Acme Supplier", Phone: "9998887777", IsActive: true},
		},
	}, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	result, err := svc.ListParties(ListPartiesInput{AuthToken: "operator-token", ActiveOnly: true})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if len(result) != 1 || result[0].Name != "Acme Supplier" {
		t.Fatalf("unexpected parties payload: %+v", result)
	}
}

func TestService_UpdateParty_MapsConcurrencyError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{updatePartyErr: domainErrors.ErrConcurrencyConflict}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.UpdateParty(UpdatePartyInput{
		ID:        1,
		PartyType: "SUPPLIER",
		Name:      "Acme Supplier",
		Phone:     "9998887777",
		UpdatedAt: "2026-02-26T10:00:00Z",
		AuthToken: "admin-token",
	})
	if err == nil || err.Error() != ErrRecordModified {
		t.Fatalf("expected %q, got %v", ErrRecordModified, err)
	}
}

func TestService_CreateUnitConversionRule_ForgedActorRolePayloadIgnored(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	var input CreateUnitConversionRuleInput
	if err := json.Unmarshal(
		[]byte(`{"from_unit":"GRAM","to_unit":"KG","factor":0.001,"precision_scale":4,"rounding_mode":"HALF_UP","actor_role":"ADMIN"}`),
		&input,
	); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	_, err := svc.CreateUnitConversionRule(input)
	if err == nil {
		t.Fatalf("expected unauthorized error because auth_token is missing")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "unauthorized" {
		t.Fatalf("expected unauthorized, got %s", typed.Code)
	}
}

func TestService_ConvertQuantity_UsesConfiguredRule(t *testing.T) {
	repo := &fakeInventoryRepo{
		conversionRules: []domainInventory.UnitConversionRule{
			{
				FromUnit:       "GRAM",
				ToUnit:         "KG",
				Factor:         0.001,
				PrecisionScale: 4,
				RoundingMode:   domainInventory.RoundingModeHalfUp,
				IsActive:       true,
			},
		},
	}
	svc := NewService(repo, fixedRoleResolver(domainAuth.RoleDataEntryOperator, nil))

	result, err := svc.ConvertQuantity(ConvertQuantityInput{
		Quantity:   500,
		SourceUnit: "gram",
		TargetUnit: "kg",
		AuthToken:  "operator-token",
	})
	if err != nil {
		t.Fatalf("ConvertQuantity failed: %v", err)
	}
	if result.QtyConverted != 0.5 {
		t.Fatalf("expected 0.5, got %f", result.QtyConverted)
	}
	if result.Precision.Scale != 4 || result.Precision.RoundingMode != "HALF_UP" {
		t.Fatalf("unexpected precision metadata: %+v", result.Precision)
	}
}

func TestService_ConvertQuantity_MissingRuleReturnsValidationError(t *testing.T) {
	svc := NewService(&fakeInventoryRepo{}, fixedRoleResolver(domainAuth.RoleAdmin, nil))

	_, err := svc.ConvertQuantity(ConvertQuantityInput{
		Quantity:   100,
		SourceUnit: "GRAM",
		TargetUnit: "KG",
		AuthToken:  "admin-token",
	})
	if err == nil {
		t.Fatalf("expected conversion rule not found error")
	}
	typed, ok := err.(*ServiceError)
	if !ok {
		t.Fatalf("expected ServiceError, got %T", err)
	}
	if typed.Code != "validation_failed" {
		t.Fatalf("expected validation_failed, got %s", typed.Code)
	}
}
