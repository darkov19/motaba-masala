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
	createItemErr  error
	createBatchErr error
	createGRNErr   error
	updateItemErr  error
	updateBatchErr error
	updateGRNErr   error
	items          []domainInventory.Item
	profiles       []domainInventory.PackagingProfile
}

func (f *fakeInventoryRepo) CreateItem(*domainInventory.Item) error   { return f.createItemErr }
func (f *fakeInventoryRepo) CreateBatch(*domainInventory.Batch) error { return f.createBatchErr }
func (f *fakeInventoryRepo) CreateGRN(*domainInventory.GRN) error     { return f.createGRNErr }

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
