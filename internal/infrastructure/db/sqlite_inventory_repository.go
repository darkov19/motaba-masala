package db

import (
	"context"
	"database/sql"
	"time"

	domainErrors "masala_inventory_managment/internal/domain/errors"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
)

type SqliteInventoryRepository struct {
	db *sql.DB
}

func NewSqliteInventoryRepository(db *sql.DB) *SqliteInventoryRepository {
	return &SqliteInventoryRepository{db: db}
}

func (r *SqliteInventoryRepository) CreateItem(item *domainInventory.Item) error {
	if item.CreatedAt.IsZero() {
		item.CreatedAt = time.Now().UTC()
	}
	if item.UpdatedAt.IsZero() {
		item.UpdatedAt = item.CreatedAt
	}

	res, err := r.db.ExecContext(
		context.Background(),
		`INSERT INTO items (sku, name, category, unit, minimum_stock, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		item.SKU, item.Name, item.Category, item.Unit, item.MinimumStock, item.IsActive, item.CreatedAt, item.UpdatedAt,
	)
	if err != nil {
		return err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	item.ID = id
	return nil
}

func (r *SqliteInventoryRepository) UpdateItem(item *domainInventory.Item) error {
	res, err := r.db.ExecContext(
		context.Background(),
		`UPDATE items
		 SET sku = ?, name = ?, category = ?, unit = ?, minimum_stock = ?, is_active = ?, updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
		 WHERE id = ? AND updated_at = ?`,
		item.SKU, item.Name, item.Category, item.Unit, item.MinimumStock, item.IsActive, item.ID, item.UpdatedAt,
	)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domainErrors.ErrConcurrencyConflict
	}

	return r.db.QueryRowContext(context.Background(), "SELECT updated_at FROM items WHERE id = ?", item.ID).Scan(&item.UpdatedAt)
}

func (r *SqliteInventoryRepository) CreateBatch(batch *domainInventory.Batch) error {
	if batch.CreatedAt.IsZero() {
		batch.CreatedAt = time.Now().UTC()
	}
	if batch.UpdatedAt.IsZero() {
		batch.UpdatedAt = batch.CreatedAt
	}

	res, err := r.db.ExecContext(
		context.Background(),
		`INSERT INTO batches (batch_number, item_id, quantity, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		batch.BatchNumber, batch.ItemID, batch.Quantity, batch.CreatedAt, batch.UpdatedAt,
	)
	if err != nil {
		return err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	batch.ID = id
	return nil
}

func (r *SqliteInventoryRepository) UpdateBatch(batch *domainInventory.Batch) error {
	res, err := r.db.ExecContext(
		context.Background(),
		`UPDATE batches
		 SET batch_number = ?, item_id = ?, quantity = ?, updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
		 WHERE id = ? AND updated_at = ?`,
		batch.BatchNumber, batch.ItemID, batch.Quantity, batch.ID, batch.UpdatedAt,
	)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domainErrors.ErrConcurrencyConflict
	}

	return r.db.QueryRowContext(context.Background(), "SELECT updated_at FROM batches WHERE id = ?", batch.ID).Scan(&batch.UpdatedAt)
}

func (r *SqliteInventoryRepository) CreateGRN(grn *domainInventory.GRN) error {
	if grn.CreatedAt.IsZero() {
		grn.CreatedAt = time.Now().UTC()
	}
	if grn.UpdatedAt.IsZero() {
		grn.UpdatedAt = grn.CreatedAt
	}

	res, err := r.db.ExecContext(
		context.Background(),
		`INSERT INTO grns (grn_number, supplier_name, invoice_no, notes, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		grn.GRNNumber, grn.SupplierName, grn.InvoiceNo, grn.Notes, grn.CreatedAt, grn.UpdatedAt,
	)
	if err != nil {
		return err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	grn.ID = id
	return nil
}

func (r *SqliteInventoryRepository) UpdateGRN(grn *domainInventory.GRN) error {
	res, err := r.db.ExecContext(
		context.Background(),
		`UPDATE grns
		 SET grn_number = ?, supplier_name = ?, invoice_no = ?, notes = ?, updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
		 WHERE id = ? AND updated_at = ?`,
		grn.GRNNumber, grn.SupplierName, grn.InvoiceNo, grn.Notes, grn.ID, grn.UpdatedAt,
	)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domainErrors.ErrConcurrencyConflict
	}

	return r.db.QueryRowContext(context.Background(), "SELECT updated_at FROM grns WHERE id = ?", grn.ID).Scan(&grn.UpdatedAt)
}
