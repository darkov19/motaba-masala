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

type RecipeComponentInput struct {
	InputItemID  int64   `json:"input_item_id"`
	InputQtyBase float64 `json:"input_qty_base"`
	LineNo       int     `json:"line_no"`
}

type CreateRecipeInput struct {
	RecipeCode         string                 `json:"recipe_code"`
	OutputItemID       int64                  `json:"output_item_id"`
	OutputQtyBase      float64                `json:"output_qty_base"`
	ExpectedWastagePct float64                `json:"expected_wastage_pct"`
	IsActive           bool                   `json:"is_active"`
	Components         []RecipeComponentInput `json:"components"`
	AuthToken          string                 `json:"auth_token"`
}

type UpdateRecipeInput struct {
	ID                 int64                  `json:"id"`
	RecipeCode         string                 `json:"recipe_code"`
	OutputItemID       int64                  `json:"output_item_id"`
	OutputQtyBase      float64                `json:"output_qty_base"`
	ExpectedWastagePct float64                `json:"expected_wastage_pct"`
	IsActive           bool                   `json:"is_active"`
	Components         []RecipeComponentInput `json:"components"`
	UpdatedAt          string                 `json:"updated_at"`
	AuthToken          string                 `json:"auth_token"`
}

type ListRecipesInput struct {
	ActiveOnly   bool   `json:"active_only"`
	OutputItemID *int64 `json:"output_item_id,omitempty"`
	Search       string `json:"search"`
	AuthToken    string `json:"auth_token"`
}

type CreatePartyInput struct {
	PartyType    string `json:"party_type"`
	Name         string `json:"name"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	Address      string `json:"address"`
	LeadTimeDays *int   `json:"lead_time_days,omitempty"`
	IsActive     bool   `json:"is_active"`
	AuthToken    string `json:"auth_token"`
}

type UpdatePartyInput struct {
	ID           int64  `json:"id"`
	PartyType    string `json:"party_type"`
	Name         string `json:"name"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	Address      string `json:"address"`
	LeadTimeDays *int   `json:"lead_time_days,omitempty"`
	IsActive     bool   `json:"is_active"`
	UpdatedAt    string `json:"updated_at"`
	AuthToken    string `json:"auth_token"`
}

type ListPartiesInput struct {
	ActiveOnly bool   `json:"active_only"`
	PartyType  string `json:"party_type"`
	Search     string `json:"search"`
	AuthToken  string `json:"auth_token"`
}

type GRNLineInput struct {
	ItemID           int64   `json:"item_id"`
	QuantityReceived float64 `json:"quantity_received"`
	UnitPrice        float64 `json:"unit_price"`
}

type CreateGRNInput struct {
	GRNNumber  string         `json:"grn_number"`
	SupplierID int64          `json:"supplier_id"`
	InvoiceNo  string         `json:"invoice_no"`
	Notes      string         `json:"notes"`
	Lines      []GRNLineInput `json:"lines"`
	AuthToken  string         `json:"auth_token"`
}

type ListMaterialLotsInput struct {
	ItemID     *int64 `json:"item_id,omitempty"`
	Supplier   string `json:"supplier"`
	LotNumber  string `json:"lot_number"`
	GRNNumber  string `json:"grn_number"`
	ActiveOnly bool   `json:"active_only"`
	Search     string `json:"search"`
	AuthToken  string `json:"auth_token"`
}

type RecordLotStockMovementInput struct {
	LotNumber       string  `json:"lot_number"`
	TransactionType string  `json:"transaction_type"`
	Quantity        float64 `json:"quantity"`
	ReferenceID     string  `json:"reference_id"`
	Notes           string  `json:"notes"`
	AuthToken       string  `json:"auth_token"`
}

type ListLotStockMovementsInput struct {
	LotNumber string `json:"lot_number"`
	AuthToken string `json:"auth_token"`
}

type CreateUnitConversionRuleInput struct {
	ItemID         *int64  `json:"item_id,omitempty"`
	FromUnit       string  `json:"from_unit"`
	ToUnit         string  `json:"to_unit"`
	Factor         float64 `json:"factor"`
	PrecisionScale int     `json:"precision_scale"`
	RoundingMode   string  `json:"rounding_mode"`
	IsActive       *bool   `json:"is_active,omitempty"`
	AuthToken      string  `json:"auth_token"`
}

type ListUnitConversionRulesInput struct {
	ItemID     *int64 `json:"item_id,omitempty"`
	FromUnit   string `json:"from_unit"`
	ToUnit     string `json:"to_unit"`
	ActiveOnly bool   `json:"active_only"`
	AuthToken  string `json:"auth_token"`
}

type ConvertQuantityInput struct {
	ItemID     *int64  `json:"item_id,omitempty"`
	Quantity   float64 `json:"quantity"`
	SourceUnit string  `json:"source_unit"`
	TargetUnit string  `json:"target_unit"`
	AuthToken  string  `json:"auth_token"`
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

func (s *Service) requireMasterWriteAccess(authToken string) error {
	role, err := s.resolveRole(authToken)
	if err != nil {
		return err
	}
	if role != domainAuth.RoleAdmin {
		return &ServiceError{
			Code:    "forbidden",
			Message: "role is not allowed to modify master data",
		}
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
	case errors.Is(err, domainInventory.ErrRecipeCodeRequired):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "recipe_code", Message: domainInventory.ErrRecipeCodeRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrRecipeOutputItemRequired):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "output_item_id", Message: domainInventory.ErrRecipeOutputItemRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrRecipeOutputQtyInvalid):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "output_qty_base", Message: domainInventory.ErrRecipeOutputQtyInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrRecipeWastageInvalid):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "expected_wastage_pct", Message: domainInventory.ErrRecipeWastageInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrRecipeComponentsRequired):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "components", Message: domainInventory.ErrRecipeComponentsRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrRecipeComponentItemID):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "components.input_item_id", Message: domainInventory.ErrRecipeComponentItemID.Error()}}}
	case errors.Is(err, domainInventory.ErrRecipeComponentQtyInvalid):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "components.input_qty_base", Message: domainInventory.ErrRecipeComponentQtyInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrRecipeComponentLineNo):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "components.line_no", Message: domainInventory.ErrRecipeComponentLineNo.Error()}}}
	case errors.Is(err, domainInventory.ErrRecipeComponentLineDup):
		return &ServiceError{Code: "validation_failed", Message: "recipe validation failed", Fields: []FieldError{{Field: "components.line_no", Message: err.Error()}}}
	case errors.Is(err, domainInventory.ErrPartyTypeRequired):
		return &ServiceError{Code: "validation_failed", Message: "party validation failed", Fields: []FieldError{{Field: "party_type", Message: domainInventory.ErrPartyTypeRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrPartyTypeUnsupported):
		return &ServiceError{Code: "validation_failed", Message: "party validation failed", Fields: []FieldError{{Field: "party_type", Message: err.Error()}}}
	case errors.Is(err, domainInventory.ErrPartyNameRequired):
		return &ServiceError{Code: "validation_failed", Message: "party validation failed", Fields: []FieldError{{Field: "name", Message: domainInventory.ErrPartyNameRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrPartyContactRequired):
		return &ServiceError{Code: "validation_failed", Message: "party validation failed", Fields: []FieldError{{Field: "contact", Message: domainInventory.ErrPartyContactRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrPartyEmailInvalid):
		return &ServiceError{Code: "validation_failed", Message: "party validation failed", Fields: []FieldError{{Field: "email", Message: domainInventory.ErrPartyEmailInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrPartyLeadTimeInvalid):
		return &ServiceError{Code: "validation_failed", Message: "party validation failed", Fields: []FieldError{{Field: "lead_time_days", Message: domainInventory.ErrPartyLeadTimeInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrPartyLeadTimeDisallowed):
		return &ServiceError{Code: "validation_failed", Message: "party validation failed", Fields: []FieldError{{Field: "lead_time_days", Message: domainInventory.ErrPartyLeadTimeDisallowed.Error()}}}
	case errors.Is(err, domainInventory.ErrGRNNumberRequired):
		return &ServiceError{Code: "validation_failed", Message: "grn validation failed", Fields: []FieldError{{Field: "grn_number", Message: domainInventory.ErrGRNNumberRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrGRNSupplierRequired):
		return &ServiceError{Code: "validation_failed", Message: "grn validation failed", Fields: []FieldError{{Field: "supplier_id", Message: domainInventory.ErrGRNSupplierRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrGRNLinesRequired):
		return &ServiceError{Code: "validation_failed", Message: "grn validation failed", Fields: []FieldError{{Field: "lines", Message: domainInventory.ErrGRNLinesRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrGRNLineItemID):
		return &ServiceError{Code: "validation_failed", Message: "grn validation failed", Fields: []FieldError{{Field: "lines.item_id", Message: domainInventory.ErrGRNLineItemID.Error()}}}
	case errors.Is(err, domainInventory.ErrGRNLineQuantity):
		return &ServiceError{Code: "validation_failed", Message: "grn validation failed", Fields: []FieldError{{Field: "lines.quantity_received", Message: domainInventory.ErrGRNLineQuantity.Error()}}}
	case errors.Is(err, domainInventory.ErrGRNLineUnitPrice):
		return &ServiceError{Code: "validation_failed", Message: "grn validation failed", Fields: []FieldError{{Field: "lines.unit_price", Message: domainInventory.ErrGRNLineUnitPrice.Error()}}}
	case errors.Is(err, domainInventory.ErrLotNumberRequired):
		return &ServiceError{Code: "validation_failed", Message: "lot movement validation failed", Fields: []FieldError{{Field: "lot_number", Message: domainInventory.ErrLotNumberRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrMovementTypeInvalid):
		return &ServiceError{Code: "validation_failed", Message: "lot movement validation failed", Fields: []FieldError{{Field: "transaction_type", Message: domainInventory.ErrMovementTypeInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrMovementQtyInvalid):
		return &ServiceError{Code: "validation_failed", Message: "lot movement validation failed", Fields: []FieldError{{Field: "quantity", Message: domainInventory.ErrMovementQtyInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionFromUnitRequired):
		return &ServiceError{Code: "validation_failed", Message: "conversion rule validation failed", Fields: []FieldError{{Field: "from_unit", Message: domainInventory.ErrConversionFromUnitRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionToUnitRequired):
		return &ServiceError{Code: "validation_failed", Message: "conversion rule validation failed", Fields: []FieldError{{Field: "to_unit", Message: domainInventory.ErrConversionToUnitRequired.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionFactorInvalid):
		return &ServiceError{Code: "validation_failed", Message: "conversion rule validation failed", Fields: []FieldError{{Field: "factor", Message: domainInventory.ErrConversionFactorInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionPrecisionInvalid):
		return &ServiceError{Code: "validation_failed", Message: "conversion rule validation failed", Fields: []FieldError{{Field: "precision_scale", Message: domainInventory.ErrConversionPrecisionInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionRoundingInvalid):
		return &ServiceError{Code: "validation_failed", Message: "conversion rule validation failed", Fields: []FieldError{{Field: "rounding_mode", Message: domainInventory.ErrConversionRoundingInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionSourceUnitMissing):
		return &ServiceError{Code: "validation_failed", Message: "conversion request validation failed", Fields: []FieldError{{Field: "source_unit", Message: domainInventory.ErrConversionSourceUnitMissing.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionTargetUnitMissing):
		return &ServiceError{Code: "validation_failed", Message: "conversion request validation failed", Fields: []FieldError{{Field: "target_unit", Message: domainInventory.ErrConversionTargetUnitMissing.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionQuantityInvalid):
		return &ServiceError{Code: "validation_failed", Message: "conversion request validation failed", Fields: []FieldError{{Field: "quantity", Message: domainInventory.ErrConversionQuantityInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionItemIDInvalid):
		return &ServiceError{Code: "validation_failed", Message: "conversion request validation failed", Fields: []FieldError{{Field: "item_id", Message: domainInventory.ErrConversionItemIDInvalid.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionRuleNotFound):
		return &ServiceError{Code: "validation_failed", Message: "conversion rule not found for requested unit pair", Fields: []FieldError{{Field: "conversion_rule", Message: domainInventory.ErrConversionRuleNotFound.Error()}}}
	case errors.Is(err, domainInventory.ErrConversionRuleMismatch):
		return &ServiceError{Code: "validation_failed", Message: "conversion rule does not match source/target units", Fields: []FieldError{{Field: "conversion_rule", Message: domainInventory.ErrConversionRuleMismatch.Error()}}}
	default:
		return err
	}
}

func mapConversionPersistenceError(err error) error {
	if err == nil {
		return nil
	}

	lowered := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(lowered, "unique constraint failed"):
		return &ServiceError{
			Code:    "conflict",
			Message: "conversion rule already exists for this unit pair",
			Fields:  []FieldError{{Field: "from_unit", Message: "duplicate conversion rule"}},
		}
	case strings.Contains(lowered, "foreign key constraint failed"):
		return &ServiceError{
			Code:    "validation_failed",
			Message: "conversion rule validation failed",
			Fields:  []FieldError{{Field: "item_id", Message: "item_id does not reference an existing item"}},
		}
	default:
		return mapValidationError(err)
	}
}

func mapRecipePersistenceError(err error) error {
	if err == nil {
		return nil
	}

	lowered := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(lowered, "unique constraint failed: recipes.recipe_code"):
		return &ServiceError{
			Code:    "conflict",
			Message: "recipe_code already exists",
			Fields:  []FieldError{{Field: "recipe_code", Message: "duplicate recipe_code"}},
		}
	case strings.Contains(lowered, "unique constraint failed: recipe_components.recipe_id, recipe_components.line_no"):
		return &ServiceError{
			Code:    "validation_failed",
			Message: "recipe validation failed",
			Fields:  []FieldError{{Field: "components.line_no", Message: "duplicate line number in recipe"}},
		}
	case strings.Contains(lowered, "foreign key constraint failed"):
		return &ServiceError{
			Code:    "validation_failed",
			Message: "recipe validation failed",
			Fields:  []FieldError{{Field: "components.input_item_id", Message: "item reference must exist"}},
		}
	case strings.Contains(lowered, "invalid output item type"):
		return &ServiceError{
			Code:    "validation_failed",
			Message: "recipe validation failed",
			Fields:  []FieldError{{Field: "output_item_id", Message: "output item must be an active BULK_POWDER item"}},
		}
	case strings.Contains(lowered, "invalid recipe component item"):
		return &ServiceError{
			Code:    "validation_failed",
			Message: "recipe validation failed",
			Fields:  []FieldError{{Field: "components.input_item_id", Message: "component item must be an active item"}},
		}
	default:
		return mapValidationError(err)
	}
}

func mapPartyPersistenceError(err error) error {
	if err == nil {
		return nil
	}

	lowered := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(lowered, "unique constraint failed"):
		return &ServiceError{
			Code:    "conflict",
			Message: "party already exists for this type",
			Fields:  []FieldError{{Field: "name", Message: "duplicate party name"}},
		}
	default:
		return mapValidationError(err)
	}
}

func mapGRNPersistenceError(err error) error {
	if err == nil {
		return nil
	}

	lowered := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(lowered, "unique constraint failed: grns.grn_number"):
		return &ServiceError{
			Code:    "conflict",
			Message: "grn_number already exists",
			Fields:  []FieldError{{Field: "grn_number", Message: "duplicate grn_number"}},
		}
	case strings.Contains(lowered, "unique constraint failed: material_lots.lot_number"):
		return &ServiceError{
			Code:    "conflict",
			Message: "lot_number already exists",
			Fields:  []FieldError{{Field: "lot_number", Message: "duplicate lot_number"}},
		}
	case strings.Contains(lowered, "invalid grn line item"):
		return &ServiceError{
			Code:    "validation_failed",
			Message: "grn validation failed",
			Fields:  []FieldError{{Field: "lines.item_id", Message: "line item must be an active RAW, PACKING_MATERIAL, or BULK_POWDER item"}},
		}
	case strings.Contains(lowered, "foreign key constraint failed"):
		return &ServiceError{
			Code:    "validation_failed",
			Message: "grn validation failed",
			Fields:  []FieldError{{Field: "supplier_id", Message: "supplier_id must reference an existing supplier party"}},
		}
	default:
		return mapValidationError(err)
	}
}

func mapLotMovementPersistenceError(err error) error {
	if err == nil {
		return nil
	}

	lowered := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(lowered, "lot not found"):
		return &ServiceError{
			Code:    "validation_failed",
			Message: "lot movement validation failed",
			Fields:  []FieldError{{Field: "lot_number", Message: "lot_number must reference an existing lot"}},
		}
	default:
		return mapValidationError(err)
	}
}

func (s *Service) CreateItemMaster(input CreateItemInput) (*domainInventory.Item, error) {
	if err := s.requireMasterWriteAccess(input.AuthToken); err != nil {
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
	if err := s.requireMasterWriteAccess(input.AuthToken); err != nil {
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
	if err := s.requireMasterWriteAccess(input.AuthToken); err != nil {
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

func (s *Service) CreateRecipe(input CreateRecipeInput) (*domainInventory.Recipe, error) {
	if err := s.requireMasterWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}

	recipe := &domainInventory.Recipe{
		RecipeCode:         input.RecipeCode,
		OutputItemID:       input.OutputItemID,
		OutputQtyBase:      input.OutputQtyBase,
		ExpectedWastagePct: input.ExpectedWastagePct,
		IsActive:           input.IsActive,
		Components:         make([]domainInventory.RecipeComponent, 0, len(input.Components)),
	}
	for _, component := range input.Components {
		recipe.Components = append(recipe.Components, domainInventory.RecipeComponent{
			InputItemID:  component.InputItemID,
			InputQtyBase: component.InputQtyBase,
			LineNo:       component.LineNo,
		})
	}

	if err := recipe.Validate(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.CreateRecipe(recipe); err != nil {
		return nil, mapRecipePersistenceError(err)
	}
	return recipe, nil
}

func (s *Service) UpdateRecipe(input UpdateRecipeInput) (*domainInventory.Recipe, error) {
	if err := s.requireMasterWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}

	updatedAt, err := parseUpdatedAt(input.UpdatedAt)
	if err != nil {
		return nil, &ServiceError{
			Code:    "validation_failed",
			Message: "recipe validation failed",
			Fields:  []FieldError{{Field: "updated_at", Message: err.Error()}},
		}
	}

	recipe := &domainInventory.Recipe{
		ID:                 input.ID,
		RecipeCode:         input.RecipeCode,
		OutputItemID:       input.OutputItemID,
		OutputQtyBase:      input.OutputQtyBase,
		ExpectedWastagePct: input.ExpectedWastagePct,
		IsActive:           input.IsActive,
		UpdatedAt:          updatedAt,
		Components:         make([]domainInventory.RecipeComponent, 0, len(input.Components)),
	}
	for _, component := range input.Components {
		recipe.Components = append(recipe.Components, domainInventory.RecipeComponent{
			InputItemID:  component.InputItemID,
			InputQtyBase: component.InputQtyBase,
			LineNo:       component.LineNo,
		})
	}

	if err := recipe.Validate(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.UpdateRecipe(recipe); err != nil {
		if errors.Is(err, domainErrors.ErrConcurrencyConflict) {
			return nil, errors.New(ErrRecordModified)
		}
		return nil, mapRecipePersistenceError(err)
	}
	return recipe, nil
}

func (s *Service) ListRecipes(input ListRecipesInput) ([]domainInventory.Recipe, error) {
	if err := s.requireReadAccess(input.AuthToken); err != nil {
		return nil, err
	}
	filter := domainInventory.RecipeListFilter{
		ActiveOnly:   input.ActiveOnly,
		OutputItemID: input.OutputItemID,
		Search:       strings.TrimSpace(input.Search),
	}
	return s.repo.ListRecipes(filter)
}

func (s *Service) CreateParty(input CreatePartyInput) (*domainInventory.Party, error) {
	if err := s.requireMasterWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}

	party := &domainInventory.Party{
		PartyType:    domainInventory.ParsePartyType(input.PartyType),
		Name:         input.Name,
		Phone:        input.Phone,
		Email:        input.Email,
		Address:      input.Address,
		LeadTimeDays: input.LeadTimeDays,
		IsActive:     input.IsActive,
	}
	if err := party.Validate(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.CreateParty(party); err != nil {
		return nil, mapPartyPersistenceError(err)
	}
	return party, nil
}

func (s *Service) UpdateParty(input UpdatePartyInput) (*domainInventory.Party, error) {
	if err := s.requireMasterWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}

	updatedAt, err := parseUpdatedAt(input.UpdatedAt)
	if err != nil {
		return nil, &ServiceError{
			Code:    "validation_failed",
			Message: "party validation failed",
			Fields:  []FieldError{{Field: "updated_at", Message: err.Error()}},
		}
	}

	party := &domainInventory.Party{
		ID:           input.ID,
		PartyType:    domainInventory.ParsePartyType(input.PartyType),
		Name:         input.Name,
		Phone:        input.Phone,
		Email:        input.Email,
		Address:      input.Address,
		LeadTimeDays: input.LeadTimeDays,
		IsActive:     input.IsActive,
		UpdatedAt:    updatedAt,
	}
	if err := party.Validate(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.UpdateParty(party); err != nil {
		if errors.Is(err, domainErrors.ErrConcurrencyConflict) {
			return nil, errors.New(ErrRecordModified)
		}
		return nil, mapPartyPersistenceError(err)
	}
	return party, nil
}

func (s *Service) ListParties(input ListPartiesInput) ([]domainInventory.Party, error) {
	if err := s.requireReadAccess(input.AuthToken); err != nil {
		return nil, err
	}

	filter := domainInventory.PartyListFilter{
		ActiveOnly: input.ActiveOnly,
		PartyType:  domainInventory.ParsePartyType(input.PartyType),
		Search:     strings.TrimSpace(input.Search),
	}
	return s.repo.ListParties(filter)
}

func (s *Service) CreateGRNRecord(input CreateGRNInput) (*domainInventory.GRN, error) {
	if err := s.requireWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}
	grn := &domainInventory.GRN{
		GRNNumber:  input.GRNNumber,
		SupplierID: input.SupplierID,
		InvoiceNo:  input.InvoiceNo,
		Notes:        input.Notes,
		Lines:        make([]domainInventory.GRNLine, 0, len(input.Lines)),
	}
	for i, line := range input.Lines {
		grn.Lines = append(grn.Lines, domainInventory.GRNLine{
			LineNo:           i + 1,
			ItemID:           line.ItemID,
			QuantityReceived: line.QuantityReceived,
			UnitPrice:        line.UnitPrice,
		})
	}
	if err := grn.Validate(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.CreateGRN(grn); err != nil {
		return nil, mapGRNPersistenceError(err)
	}
	return grn, nil
}

func (s *Service) ListMaterialLots(input ListMaterialLotsInput) ([]domainInventory.MaterialLot, error) {
	if err := s.requireReadAccess(input.AuthToken); err != nil {
		return nil, err
	}

	filter := domainInventory.MaterialLotListFilter{
		ItemID:     input.ItemID,
		Supplier:   strings.TrimSpace(input.Supplier),
		LotNumber:  strings.TrimSpace(input.LotNumber),
		GRNNumber:  strings.TrimSpace(input.GRNNumber),
		ActiveOnly: input.ActiveOnly,
		Search:     strings.TrimSpace(input.Search),
	}
	return s.repo.ListMaterialLots(filter)
}

func (s *Service) RecordLotStockMovement(input RecordLotStockMovementInput) (*domainInventory.StockLedgerMovement, error) {
	if err := s.requireWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}

	movement := &domainInventory.StockLedgerMovement{
		LotNumber:       input.LotNumber,
		TransactionType: input.TransactionType,
		Quantity:        input.Quantity,
		ReferenceID:     input.ReferenceID,
		Notes:           input.Notes,
	}
	if err := movement.ValidateNonInbound(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.RecordLotStockMovement(movement); err != nil {
		return nil, mapLotMovementPersistenceError(err)
	}
	return movement, nil
}

func (s *Service) ListLotStockMovements(input ListLotStockMovementsInput) ([]domainInventory.StockLedgerMovement, error) {
	if err := s.requireReadAccess(input.AuthToken); err != nil {
		return nil, err
	}
	filter := domainInventory.StockLedgerMovementListFilter{
		LotNumber: strings.TrimSpace(input.LotNumber),
	}
	return s.repo.ListLotStockMovements(filter)
}

func (s *Service) CreateUnitConversionRule(input CreateUnitConversionRuleInput) (*domainInventory.UnitConversionRule, error) {
	if err := s.requireMasterWriteAccess(input.AuthToken); err != nil {
		return nil, err
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	rule := &domainInventory.UnitConversionRule{
		ItemID:         input.ItemID,
		FromUnit:       input.FromUnit,
		ToUnit:         input.ToUnit,
		Factor:         input.Factor,
		PrecisionScale: input.PrecisionScale,
		RoundingMode:   domainInventory.ParseRoundingMode(input.RoundingMode),
		IsActive:       isActive,
	}
	if err := rule.Validate(); err != nil {
		return nil, mapValidationError(err)
	}
	if err := s.repo.CreateUnitConversionRule(rule); err != nil {
		return nil, mapConversionPersistenceError(err)
	}
	return rule, nil
}

func (s *Service) ListUnitConversionRules(input ListUnitConversionRulesInput) ([]domainInventory.UnitConversionRule, error) {
	if err := s.requireReadAccess(input.AuthToken); err != nil {
		return nil, err
	}
	filter := domainInventory.UnitConversionRuleFilter{
		ItemID:     input.ItemID,
		FromUnit:   input.FromUnit,
		ToUnit:     input.ToUnit,
		ActiveOnly: input.ActiveOnly,
	}
	return s.repo.ListUnitConversionRules(filter)
}

func (s *Service) ConvertQuantity(input ConvertQuantityInput) (*domainInventory.UnitConversionResult, error) {
	if err := s.requireReadAccess(input.AuthToken); err != nil {
		return nil, err
	}

	request := domainInventory.UnitConversionRequest{
		ItemID:     input.ItemID,
		Quantity:   input.Quantity,
		SourceUnit: input.SourceUnit,
		TargetUnit: input.TargetUnit,
	}
	if err := request.Validate(); err != nil {
		return nil, mapValidationError(err)
	}

	if request.SourceUnit == request.TargetUnit {
		result := &domainInventory.UnitConversionResult{
			QtyConverted: request.Quantity,
			Precision: domainInventory.ConversionPrecisionMeta{
				Scale:        0,
				RoundingMode: string(domainInventory.RoundingModeHalfUp),
			},
			SourceUnit: request.SourceUnit,
			TargetUnit: request.TargetUnit,
			Factor:     1,
		}
		return result, nil
	}

	rule, err := s.repo.FindUnitConversionRule(domainInventory.UnitConversionLookup{
		ItemID:   request.ItemID,
		FromUnit: request.SourceUnit,
		ToUnit:   request.TargetUnit,
	})
	if err != nil {
		return nil, mapConversionPersistenceError(err)
	}

	result, err := domainInventory.ApplyUnitConversion(request, *rule)
	if err != nil {
		return nil, mapValidationError(err)
	}
	return &result, nil
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
