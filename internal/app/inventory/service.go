package inventory

import (
	"errors"

	appLicenseMode "masala_inventory_managment/internal/app/licensemode"
	domainErrors "masala_inventory_managment/internal/domain/errors"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
)

const ErrRecordModified = "Record modified by another user. Reload required."

type Service struct {
	repo domainInventory.Repository
}

func NewService(repo domainInventory.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateItem(item *domainInventory.Item) error {
	if err := appLicenseMode.RequireWriteAccess(); err != nil {
		return err
	}
	if err := s.repo.CreateItem(item); err != nil {
		return err
	}
	return nil
}

func (s *Service) UpdateItem(item *domainInventory.Item) error {
	if err := appLicenseMode.RequireWriteAccess(); err != nil {
		return err
	}
	if err := s.repo.UpdateItem(item); err != nil {
		if errors.Is(err, domainErrors.ErrConcurrencyConflict) {
			return errors.New(ErrRecordModified)
		}
		return err
	}
	return nil
}

func (s *Service) CreateBatch(batch *domainInventory.Batch) error {
	if err := appLicenseMode.RequireWriteAccess(); err != nil {
		return err
	}
	if err := s.repo.CreateBatch(batch); err != nil {
		return err
	}
	return nil
}

func (s *Service) UpdateBatch(batch *domainInventory.Batch) error {
	if err := appLicenseMode.RequireWriteAccess(); err != nil {
		return err
	}
	if err := s.repo.UpdateBatch(batch); err != nil {
		if errors.Is(err, domainErrors.ErrConcurrencyConflict) {
			return errors.New(ErrRecordModified)
		}
		return err
	}
	return nil
}

func (s *Service) CreateGRN(grn *domainInventory.GRN) error {
	if err := appLicenseMode.RequireWriteAccess(); err != nil {
		return err
	}
	if err := s.repo.CreateGRN(grn); err != nil {
		return err
	}
	return nil
}

func (s *Service) UpdateGRN(grn *domainInventory.GRN) error {
	if err := appLicenseMode.RequireWriteAccess(); err != nil {
		return err
	}
	if err := s.repo.UpdateGRN(grn); err != nil {
		if errors.Is(err, domainErrors.ErrConcurrencyConflict) {
			return errors.New(ErrRecordModified)
		}
		return err
	}
	return nil
}
