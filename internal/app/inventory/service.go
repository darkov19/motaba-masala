package inventory

import (
	"errors"
	"fmt"
	"strings"
	"time"

	appLicenseMode "masala_inventory_managment/internal/app/licensemode"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	domainErrors "masala_inventory_managment/internal/domain/errors"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
)

const ErrRecordModified = "Record modified by another user. Reload required."

type Service struct {
	repo         domainInventory.Repository
	roleResolver func(authToken string) (domainAuth.Role, error)
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ServiceError struct {
	Code    string       `json:"code"`
	Message string       `json:"message"`
	Fields  []FieldError `json:"fields,omitempty"`
}

func (e *ServiceError) Error() string {
	return e.Message
}

type CreateItemInput struct {
	SKU          string  `json:"sku"`
	Name         string  `json:"name"`
	ItemType     string  `json:"item_type"`
	BaseUnit     string  `json:"base_unit"`
	ItemSubtype  string  `json:"item_subtype"`
	MinimumStock float64 `json:"minimum_stock"`
	IsActive     bool    `json:"is_active"`
	AuthToken    string  `json:"auth_token"`
}

type UpdateItemInput struct {
	ID           int64   `json:"id"`
	SKU          string  `json:"sku"`
	Name         string  `json:"name"`
	ItemType     string  `json:"item_type"`
	BaseUnit     string  `json:"base_unit"`
	ItemSubtype  string  `json:"item_subtype"`
	MinimumStock float64 `json:"minimum_stock"`
	IsActive     bool    `json:"is_active"`
	UpdatedAt    string  `json:"updated_at"`
	AuthToken    string  `json:"auth_token"`
}

type ListItemsInput struct {
	ActiveOnly bool   `json:"active_only"`
	ItemType   string `json:"item_type"`
	Search     string `json:"search"`
	AuthToken  string `json:"auth_token"`
}

type PackagingProfileComponentInput struct {
	PackingMaterialItemID int64   `json:"packing_material_item_id"`
	QtyPerUnit            float64 `json:"qty_per_unit"`
}

type CreatePackagingProfileInput struct {
	Name       string                           `json:"name"`
	PackMode   string                           `json:"pack_mode"`
	IsActive   bool                             `json:"is_active"`
	Components []PackagingProfileComponentInput `json:"components"`
	AuthToken  string                           `json:"auth_token"`
}

type ListPackagingProfilesInput struct {
	ActiveOnly bool   `json:"active_only"`
	Search     string `json:"search"`
	PackMode   string `json:"pack_mode"`
	AuthToken  string `json:"auth_token"`
}

func NewService(repo domainInventory.Repository, roleResolver func(authToken string) (domainAuth.Role, error)) *Service {
	return &Service{
		repo:         repo,
		roleResolver: roleResolver,
	}
}

func (s *Service) resolveRole(authToken string) (domainAuth.Role, error) {
	token := strings.TrimSpace(authToken)
	if token == "" {
		return "", &ServiceError{
			Code:    "unauthorized",
			Message: "missing authentication token",
		}
	}
	if s.roleResolver == nil {
		return "", &ServiceError{
			Code:    "unauthorized",
			Message: "authentication resolver is not configured",
		}
	}
	role, err := s.roleResolver(token)
	if err != nil {
		return "", &ServiceError{
			Code:    "unauthorized",
			Message: "invalid or expired authentication token",
		}
	}
	return role, nil
}

func (s *Service) requireReadAccess(authToken string) error {
	role, err := s.resolveRole(authToken)
	if err != nil {
		return err
	}
	switch role {
	case domainAuth.RoleAdmin, domainAuth.RoleDataEntryOperator:
		return nil
	default:
		return &ServiceError{
			Code:    "forbidden",
			Message: "role is not allowed to read master data",
		}
	}
}

func (s *Service) requireWriteAccess(authToken string) error {
	if err := s.requireReadAccess(authToken); err != nil {
		return err
	}
	return appLicenseMode.RequireWriteAccess()
}

func mapValidationError(err error) error {
	switch {
	case errors.Is(err, domainInventory.ErrItemNameRequired):
		return &ServiceError{Code: "validation_failed", Message: "item validation failed", Fields: []FieldError{{Field: "name", Message: domainInventory.ErrItemNameRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrItemTypeRequired):
		return &ServiceError{Code: "validation_failed", Message: "item validation failed", Fields: []FieldError{{Field: "item_type", Message: domainInventory.ErrItemTypeRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrUnsupportedItemType):
		return &ServiceError{Code: "validation_failed", Message: "item validation failed", Fields: []FieldError{{Field: "item_type", Message: err.Error()}}}
	case errors.Is(err, domainInventory.ErrBaseUnitRequired):
		return &ServiceError{Code: "validation_failed", Message: "item validation failed", Fields: []FieldError{{Field: "base_unit", Message: domainInventory.ErrBaseUnitRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrProfileNameRequired):
		return &ServiceError{Code: "validation_failed", Message: "packaging profile validation failed", Fields: []FieldError{{Field: "name", Message: domainInventory.ErrProfileNameRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrPackModeRequired):
		return &ServiceError{Code: "validation_failed", Message: "packaging profile validation failed", Fields: []FieldError{{Field: "pack_mode", Message: domainInventory.ErrPackModeRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrProfileComponents):
		return &ServiceError{Code: "validation_failed", Message: "packaging profile validation failed", Fields: []FieldError{{Field: "components", Message: domainInventory.ErrProfileComponents.Error()}}}
	case errors.Is(err, domainInventory.ErrComponentItemID):
		return &ServiceError{Code: "validation_failed", Message: "packaging profile validation failed", Fields: []FieldError{{Field: "components.packing_material_item_id", Message: domainInventory.ErrComponentItemID.Error()}}}
	case errors.Is(err, domainInventory.ErrComponentQty):
		return &ServiceError{Code: "validation_failed", Message: "packaging profile validation failed", Fields: []FieldError{{Field: "components.qty_per_unit", Message: domainInventory.ErrComponentQty.Error()}}}
	default:
		return err
	}
}

func (s *Service) CreateItemMaster(input CreateItemInput) (*domainInventory.Item, error) {
	if err := s.requireWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}
	item := &domainInventory.Item{
		SKU:          strings.TrimSpace(input.SKU),
		Name:         input.Name,
		ItemType:     domainInventory.ParseItemType(input.ItemType),
		BaseUnit:     input.BaseUnit,
		ItemSubtype:  input.ItemSubtype,
		MinimumStock: input.MinimumStock,
		IsActive:     input.IsActive,
	}
	if err := item.ValidateMasterContract(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.CreateItem(item); err != nil {
		return nil, mapValidationError(err)
	}
	return item, nil
}

func parseUpdatedAt(value string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(value))
	if err == nil {
		return parsed, nil
	}
	parsed, err = time.Parse(time.RFC3339, strings.TrimSpace(value))
	if err == nil {
		return parsed, nil
	}
	return time.Time{}, fmt.Errorf("invalid updated_at timestamp")
}

func (s *Service) UpdateItemMaster(input UpdateItemInput) (*domainInventory.Item, error) {
	if err := s.requireWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}
	updatedAt, err := parseUpdatedAt(input.UpdatedAt)
	if err != nil {
		return nil, &ServiceError{
			Code:    "validation_failed",
			Message: "item validation failed",
			Fields:  []FieldError{{Field: "updated_at", Message: err.Error()}},
		}
	}
	item := &domainInventory.Item{
		ID:           input.ID,
		SKU:          strings.TrimSpace(input.SKU),
		Name:         input.Name,
		ItemType:     domainInventory.ParseItemType(input.ItemType),
		BaseUnit:     input.BaseUnit,
		ItemSubtype:  input.ItemSubtype,
		MinimumStock: input.MinimumStock,
		IsActive:     input.IsActive,
		UpdatedAt:    updatedAt,
	}
	if err := s.repo.UpdateItem(item); err != nil {
		if errors.Is(err, domainErrors.ErrConcurrencyConflict) {
			return nil, errors.New(ErrRecordModified)
		}
		return nil, mapValidationError(err)
	}
	return item, nil
}

func (s *Service) ListItems(input ListItemsInput) ([]domainInventory.Item, error) {
	if err := s.requireReadAccess(input.AuthToken); err != nil {
		return nil, err
	}
	filter := domainInventory.ItemListFilter{
		ActiveOnly: input.ActiveOnly,
		ItemType:   domainInventory.ParseItemType(input.ItemType),
		Search:     strings.TrimSpace(input.Search),
	}
	return s.repo.ListItems(filter)
}

func (s *Service) CreatePackagingProfile(input CreatePackagingProfileInput) (*domainInventory.PackagingProfile, error) {
	if err := s.requireWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}
	profile := &domainInventory.PackagingProfile{
		Name:     input.Name,
		PackMode: input.PackMode,
		IsActive: input.IsActive,
	}
	profile.Components = make([]domainInventory.PackagingProfileComponent, 0, len(input.Components))
	for _, c := range input.Components {
		profile.Components = append(profile.Components, domainInventory.PackagingProfileComponent{
			PackingMaterialItemID: c.PackingMaterialItemID,
			QtyPerUnit:            c.QtyPerUnit,
		})
	}
	if err := profile.Validate(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.CreatePackagingProfile(profile); err != nil {
		return nil, mapValidationError(err)
	}
	return profile, nil
}

func (s *Service) ListPackagingProfiles(input ListPackagingProfilesInput) ([]domainInventory.PackagingProfile, error) {
	if err := s.requireReadAccess(input.AuthToken); err != nil {
		return nil, err
	}
	filter := domainInventory.PackagingProfileListFilter{
		ActiveOnly: input.ActiveOnly,
		Search:     strings.TrimSpace(input.Search),
		PackMode:   strings.TrimSpace(input.PackMode),
	}
	return s.repo.ListPackagingProfiles(filter)
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
