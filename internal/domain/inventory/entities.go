package inventory

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

type ItemType string

const (
	ItemTypeRaw             ItemType = "RAW"
	ItemTypeBulkPowder      ItemType = "BULK_POWDER"
	ItemTypePackingMaterial ItemType = "PACKING_MATERIAL"
	ItemTypeFinishedGood    ItemType = "FINISHED_GOOD"
)

var (
	ErrItemNameRequired              = errors.New("item name is required")
	ErrItemTypeRequired              = errors.New("item type is required")
	ErrBaseUnitRequired              = errors.New("base unit is required")
	ErrUnsupportedItemType           = errors.New("unsupported item type")
	ErrProfileNameRequired           = errors.New("packaging profile name is required")
	ErrPackModeRequired              = errors.New("pack mode is required")
	ErrProfileComponents             = errors.New("at least one packaging component is required")
	ErrComponentItemID               = errors.New("packing material item id is required")
	ErrComponentQty                  = errors.New("component qty_per_unit must be greater than zero")
	ErrGRNNumberRequired             = errors.New("grn number is required")
	ErrGRNSupplierRequired           = errors.New("supplier id is required")
	ErrGRNLinesRequired              = errors.New("at least one grn line is required")
	ErrGRNLineItemID                 = errors.New("grn line item id is required")
	ErrGRNLineQuantity               = errors.New("grn line quantity must be greater than zero")
	ErrGRNLineUnitPrice              = errors.New("grn line unit price must not be negative")
	ErrLotNumberRequired             = errors.New("lot number is required")
	ErrMovementTypeInvalid           = errors.New("movement type must be OUT or ADJUSTMENT")
	ErrMovementQtyInvalid            = errors.New("movement quantity must be greater than zero")
	ErrStockAdjReasonCodeRequired    = errors.New("reason_code is required")
	ErrStockAdjReasonCodeUnsupported = errors.New("reason_code is not a valid value")
	ErrStockAdjQtyDeltaZero          = errors.New("qty_delta must not be zero")
)

// ValidReasonCodes is the exhaustive list of allowed reason_code values for stock adjustments.
var ValidReasonCodes = []string{"Spoilage", "Audit Correction", "Damage", "Counting Error", "Other"}

func ParseItemType(value string) ItemType {
	return ItemType(strings.ToUpper(strings.TrimSpace(value)))
}

func (t ItemType) IsSupported() bool {
	switch t {
	case ItemTypeRaw, ItemTypeBulkPowder, ItemTypePackingMaterial, ItemTypeFinishedGood:
		return true
	default:
		return false
	}
}

type Item struct {
	ID           int64     `json:"id"`
	SKU          string    `json:"sku"`
	Name         string    `json:"name"`
	Category     string    `json:"category"` // Backward-compatible alias of ItemType.
	Unit         string    `json:"unit"`     // Backward-compatible alias of BaseUnit.
	ItemType     ItemType  `json:"item_type"`
	BaseUnit     string    `json:"base_unit"`
	ItemSubtype  string    `json:"item_subtype"`
	MinimumStock float64   `json:"minimum_stock"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (i *Item) NormalizeMasterFields() {
	if i == nil {
		return
	}

	i.Name = strings.TrimSpace(i.Name)
	i.BaseUnit = strings.TrimSpace(i.BaseUnit)
	i.Unit = strings.TrimSpace(i.Unit)
	i.Category = strings.TrimSpace(i.Category)
	i.ItemSubtype = strings.TrimSpace(i.ItemSubtype)

	if i.ItemType == "" && i.Category != "" {
		i.ItemType = ParseItemType(i.Category)
	}
	if i.BaseUnit == "" && i.Unit != "" {
		i.BaseUnit = i.Unit
	}

	if i.Category == "" && i.ItemType != "" {
		i.Category = string(i.ItemType)
	}
	if i.Unit == "" && i.BaseUnit != "" {
		i.Unit = i.BaseUnit
	}
}

func (i *Item) ValidateMasterContract() error {
	if i == nil {
		return errors.New("item is nil")
	}

	i.NormalizeMasterFields()

	if i.Name == "" {
		return ErrItemNameRequired
	}
	if i.ItemType == "" {
		return ErrItemTypeRequired
	}
	if !i.ItemType.IsSupported() {
		return fmt.Errorf("%w: %s", ErrUnsupportedItemType, i.ItemType)
	}
	if i.BaseUnit == "" {
		return ErrBaseUnitRequired
	}

	return nil
}

type Batch struct {
	ID          int64     `json:"id"`
	BatchNumber string    `json:"batch_number"`
	ItemID      int64     `json:"item_id"`
	Quantity    float64   `json:"quantity"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PackagingProfile struct {
	ID         int64                       `json:"id"`
	Name       string                      `json:"name"`
	PackMode   string                      `json:"pack_mode"`
	IsActive   bool                        `json:"is_active"`
	Components []PackagingProfileComponent `json:"components"`
	CreatedAt  time.Time                   `json:"created_at"`
	UpdatedAt  time.Time                   `json:"updated_at"`
}

type PackagingProfileComponent struct {
	ID                    int64   `json:"id"`
	ProfileID             int64   `json:"profile_id"`
	PackingMaterialItemID int64   `json:"packing_material_item_id"`
	QtyPerUnit            float64 `json:"qty_per_unit"`
}

func (p *PackagingProfile) Validate() error {
	if p == nil {
		return errors.New("packaging profile is nil")
	}

	p.Name = strings.TrimSpace(p.Name)
	p.PackMode = strings.TrimSpace(p.PackMode)

	if p.Name == "" {
		return ErrProfileNameRequired
	}
	if p.PackMode == "" {
		return ErrPackModeRequired
	}
	if len(p.Components) == 0 {
		return ErrProfileComponents
	}

	for _, component := range p.Components {
		if component.PackingMaterialItemID <= 0 {
			return ErrComponentItemID
		}
		if component.QtyPerUnit <= 0 {
			return ErrComponentQty
		}
	}
	return nil
}

type GRN struct {
	ID         int64     `json:"id"`
	GRNNumber  string    `json:"grn_number"`
	SupplierID int64     `json:"supplier_id"`
	InvoiceNo  string    `json:"invoice_no"`
	Notes      string    `json:"notes"`
	Lines      []GRNLine `json:"lines"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type GRNLine struct {
	ID               int64   `json:"id"`
	GRNID            int64   `json:"grn_id"`
	LineNo           int     `json:"line_no"`
	ItemID           int64   `json:"item_id"`
	QuantityReceived float64 `json:"quantity_received"`
	UnitPrice        float64 `json:"unit_price"`
	LotNumber        string  `json:"lot_number"`
}

type MaterialLot struct {
	ID               int64     `json:"id"`
	LotNumber        string    `json:"lot_number"`
	GRNID            int64     `json:"grn_id"`
	GRNLineID        int64     `json:"grn_line_id"`
	GRNNumber        string    `json:"grn_number"`
	ItemID           int64     `json:"item_id"`
	SupplierID       int64     `json:"supplier_id"`
	SupplierName     string    `json:"supplier_name"` // display-only, resolved via JOIN on parties
	QuantityReceived float64   `json:"quantity_received"`
	SourceType       string    `json:"source_type"`
	UnitCost         float64   `json:"unit_cost"`
	CreatedAt        time.Time `json:"created_at"`
}

type MaterialLotListFilter struct {
	ItemID     *int64
	Supplier   string
	LotNumber  string
	GRNNumber  string
	ActiveOnly bool
	Search     string
}

type StockLedgerMovement struct {
	ID              int64     `json:"id"`
	ItemID          int64     `json:"item_id"`
	TransactionType string    `json:"transaction_type"`
	Quantity        float64   `json:"quantity"`
	ReferenceID     string    `json:"reference_id"`
	LotNumber       string    `json:"lot_number"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
}

type StockLedgerMovementListFilter struct {
	LotNumber string
}

func (m *StockLedgerMovement) ValidateNonInbound() error {
	if m == nil {
		return errors.New("movement is nil")
	}
	m.TransactionType = strings.ToUpper(strings.TrimSpace(m.TransactionType))
	m.ReferenceID = strings.TrimSpace(m.ReferenceID)
	m.LotNumber = strings.TrimSpace(m.LotNumber)
	m.Notes = strings.TrimSpace(m.Notes)

	if m.LotNumber == "" {
		return ErrLotNumberRequired
	}
	if m.TransactionType != "OUT" && m.TransactionType != "ADJUSTMENT" {
		return ErrMovementTypeInvalid
	}
	if m.Quantity <= 0 {
		return ErrMovementQtyInvalid
	}
	return nil
}

type StockAdjustment struct {
	ID         int64     `json:"id"`
	ItemID     int64     `json:"item_id"`
	LotID      *int64    `json:"lot_id"`
	QtyDelta   float64   `json:"qty_delta"`
	ReasonCode string    `json:"reason_code"`
	Notes      string    `json:"notes"`
	CreatedBy  string    `json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
}

func (a *StockAdjustment) Validate() error {
	if a == nil {
		return errors.New("stock adjustment is nil")
	}
	a.ReasonCode = strings.TrimSpace(a.ReasonCode)
	a.Notes = strings.TrimSpace(a.Notes)

	if a.ReasonCode == "" {
		return ErrStockAdjReasonCodeRequired
	}
	valid := false
	for _, rc := range ValidReasonCodes {
		if a.ReasonCode == rc {
			valid = true
			break
		}
	}
	if !valid {
		return ErrStockAdjReasonCodeUnsupported
	}
	if a.QtyDelta == 0 {
		return ErrStockAdjQtyDeltaZero
	}
	return nil
}

func (g *GRN) Validate() error {
	if g == nil {
		return errors.New("grn is nil")
	}
	g.GRNNumber = strings.TrimSpace(g.GRNNumber)
	g.InvoiceNo = strings.TrimSpace(g.InvoiceNo)
	g.Notes = strings.TrimSpace(g.Notes)

	if g.GRNNumber == "" {
		return ErrGRNNumberRequired
	}
	if g.SupplierID <= 0 {
		return ErrGRNSupplierRequired
	}
	if len(g.Lines) == 0 {
		return ErrGRNLinesRequired
	}
	for i := range g.Lines {
		line := &g.Lines[i]
		if line.LineNo <= 0 {
			line.LineNo = i + 1
		}
		if line.ItemID <= 0 {
			return ErrGRNLineItemID
		}
		if line.QuantityReceived <= 0 {
			return ErrGRNLineQuantity
		}
		if line.UnitPrice < 0 {
			return ErrGRNLineUnitPrice
		}
	}
	return nil
}
