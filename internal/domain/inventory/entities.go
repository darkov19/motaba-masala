package inventory

import "time"

type Item struct {
	ID           int64     `json:"id"`
	SKU          string    `json:"sku"`
	Name         string    `json:"name"`
	Category     string    `json:"category"`
	Unit         string    `json:"unit"`
	MinimumStock float64   `json:"minimum_stock"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Batch struct {
	ID          int64     `json:"id"`
	BatchNumber string    `json:"batch_number"`
	ItemID      int64     `json:"item_id"`
	Quantity    float64   `json:"quantity"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type GRN struct {
	ID           int64     `json:"id"`
	GRNNumber    string    `json:"grn_number"`
	SupplierName string    `json:"supplier_name"`
	InvoiceNo    string    `json:"invoice_no"`
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
