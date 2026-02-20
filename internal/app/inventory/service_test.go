package inventory

import (
	"errors"
	"testing"

	appLicenseMode "masala_inventory_managment/internal/app/licensemode"
	domainErrors "masala_inventory_managment/internal/domain/errors"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
)

type fakeInventoryRepo struct {
	updateItemErr  error
	updateBatchErr error
	updateGRNErr   error
}

func (f *fakeInventoryRepo) CreateItem(*domainInventory.Item) error   { return nil }
func (f *fakeInventoryRepo) CreateBatch(*domainInventory.Batch) error { return nil }
func (f *fakeInventoryRepo) CreateGRN(*domainInventory.GRN) error     { return nil }

func (f *fakeInventoryRepo) UpdateItem(*domainInventory.Item) error   { return f.updateItemErr }
func (f *fakeInventoryRepo) UpdateBatch(*domainInventory.Batch) error { return f.updateBatchErr }
func (f *fakeInventoryRepo) UpdateGRN(*domainInventory.GRN) error     { return f.updateGRNErr }

func TestService_UpdateItem_MapsConcurrencyError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{updateItemErr: domainErrors.ErrConcurrencyConflict})

	err := svc.UpdateItem(&domainInventory.Item{ID: 1})
	if err == nil || err.Error() != ErrRecordModified {
		t.Fatalf("expected %q, got %v", ErrRecordModified, err)
	}
}

func TestService_UpdateBatch_MapsConcurrencyError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{updateBatchErr: domainErrors.ErrConcurrencyConflict})

	err := svc.UpdateBatch(&domainInventory.Batch{ID: 1})
	if err == nil || err.Error() != ErrRecordModified {
		t.Fatalf("expected %q, got %v", ErrRecordModified, err)
	}
}

func TestService_UpdateGRN_MapsConcurrencyError(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	svc := NewService(&fakeInventoryRepo{updateGRNErr: domainErrors.ErrConcurrencyConflict})

	err := svc.UpdateGRN(&domainInventory.GRN{ID: 1})
	if err == nil || err.Error() != ErrRecordModified {
		t.Fatalf("expected %q, got %v", ErrRecordModified, err)
	}
}

func TestService_UpdateItem_PassesThroughNonConcurrencyErrors(t *testing.T) {
	appLicenseMode.SetWriteEnforcer(nil)
	expected := errors.New("db unavailable")
	svc := NewService(&fakeInventoryRepo{updateItemErr: expected})

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
	svc := NewService(&fakeInventoryRepo{})

	err := svc.UpdateItem(&domainInventory.Item{ID: 1})
	if !errors.Is(err, appLicenseMode.ErrReadOnlyMode) {
		t.Fatalf("expected read-only error, got %v", err)
	}
}
