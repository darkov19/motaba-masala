package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	domainErrors "masala_inventory_managment/internal/domain/errors"
	domainInventory "masala_inventory_managment/internal/domain/inventory"
)

type SqliteInventoryRepository struct {
	db *sql.DB
}

func itemDetailsTable(itemType domainInventory.ItemType) string {
	switch itemType {
	case domainInventory.ItemTypeRaw:
		return "raw_item_details"
	case domainInventory.ItemTypeBulkPowder:
		return "bulk_powder_item_details"
	case domainInventory.ItemTypePackingMaterial:
		return "packing_material_item_details"
	case domainInventory.ItemTypeFinishedGood:
		return "finished_good_item_details"
	default:
		return ""
	}
}

func (r *SqliteInventoryRepository) ensureItemDetailsRow(item *domainInventory.Item) error {
	if item == nil || item.ID <= 0 {
		return nil
	}

	table := itemDetailsTable(item.ItemType)
	if table == "" {
		return nil
	}

	statement := fmt.Sprintf("INSERT OR IGNORE INTO %s (item_id) VALUES (?)", table)
	_, err := r.db.ExecContext(context.Background(), statement, item.ID)
	return err
}

func NewSqliteInventoryRepository(db *sql.DB) *SqliteInventoryRepository {
	return &SqliteInventoryRepository{db: db}
}

func (r *SqliteInventoryRepository) CreateItem(item *domainInventory.Item) error {
	if err := item.ValidateMasterContract(); err != nil {
		return err
	}

	if item.CreatedAt.IsZero() {
		item.CreatedAt = time.Now().UTC()
	}
	if item.UpdatedAt.IsZero() {
		item.UpdatedAt = item.CreatedAt
	}

	res, err := r.db.ExecContext(
		context.Background(),
		`INSERT INTO items (sku, name, category, unit, item_type, base_unit, item_subtype, minimum_stock, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		item.SKU, item.Name, item.Category, item.Unit, string(item.ItemType), item.BaseUnit, item.ItemSubtype, item.MinimumStock, item.IsActive, item.CreatedAt, item.UpdatedAt,
	)
	if err != nil {
		return err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	item.ID = id

	return r.ensureItemDetailsRow(item)
}

func (r *SqliteInventoryRepository) UpdateItem(item *domainInventory.Item) error {
	if err := item.ValidateMasterContract(); err != nil {
		return err
	}

	res, err := r.db.ExecContext(
		context.Background(),
		`UPDATE items
		 SET sku = ?, name = ?, category = ?, unit = ?, item_type = ?, base_unit = ?, item_subtype = ?, minimum_stock = ?, is_active = ?, updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
		 WHERE id = ? AND updated_at = ?`,
		item.SKU, item.Name, item.Category, item.Unit, string(item.ItemType), item.BaseUnit, item.ItemSubtype, item.MinimumStock, item.IsActive, item.ID, item.UpdatedAt,
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

	if err := r.db.QueryRowContext(context.Background(), "SELECT updated_at FROM items WHERE id = ?", item.ID).Scan(&item.UpdatedAt); err != nil {
		return err
	}

	return r.ensureItemDetailsRow(item)
}

func (r *SqliteInventoryRepository) ListItems(filter domainInventory.ItemListFilter) ([]domainInventory.Item, error) {
	args := make([]any, 0, 3)
	clauses := make([]string, 0, 3)
	if filter.ActiveOnly {
		clauses = append(clauses, "is_active = 1")
	}
	if filter.ItemType != "" {
		clauses = append(clauses, "item_type = ?")
		args = append(args, string(filter.ItemType))
	}
	if strings.TrimSpace(filter.Search) != "" {
		clauses = append(clauses, "(name LIKE ? OR sku LIKE ?)")
		query := "%" + strings.TrimSpace(filter.Search) + "%"
		args = append(args, query, query)
	}

	statement := `SELECT id, sku, name, category, unit, item_type, base_unit, COALESCE(item_subtype, ''), minimum_stock, is_active, created_at, updated_at FROM items`
	if len(clauses) > 0 {
		statement += " WHERE " + strings.Join(clauses, " AND ")
	}
	statement += " ORDER BY name COLLATE NOCASE ASC"

	rows, err := r.db.QueryContext(context.Background(), statement, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domainInventory.Item, 0)
	for rows.Next() {
		var item domainInventory.Item
		var itemType string
		if err := rows.Scan(
			&item.ID,
			&item.SKU,
			&item.Name,
			&item.Category,
			&item.Unit,
			&itemType,
			&item.BaseUnit,
			&item.ItemSubtype,
			&item.MinimumStock,
			&item.IsActive,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.ItemType = domainInventory.ParseItemType(itemType)
		item.NormalizeMasterFields()
		items = append(items, item)
	}

	return items, rows.Err()
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

func (r *SqliteInventoryRepository) CreatePackagingProfile(profile *domainInventory.PackagingProfile) error {
	if err := profile.Validate(); err != nil {
		return err
	}
	if profile.CreatedAt.IsZero() {
		profile.CreatedAt = time.Now().UTC()
	}
	if profile.UpdatedAt.IsZero() {
		profile.UpdatedAt = profile.CreatedAt
	}

	tx, err := r.db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	res, err := tx.ExecContext(
		context.Background(),
		`INSERT INTO packaging_profiles (name, pack_mode, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		strings.TrimSpace(profile.Name),
		strings.TrimSpace(profile.PackMode),
		profile.IsActive,
		profile.CreatedAt,
		profile.UpdatedAt,
	)
	if err != nil {
		return err
	}
	profileID, err := res.LastInsertId()
	if err != nil {
		return err
	}
	profile.ID = profileID

	for i := range profile.Components {
		component := &profile.Components[i]
		if err := r.validatePackingMaterialAssignableTx(tx, component.PackingMaterialItemID); err != nil {
			return err
		}
		componentRes, err := tx.ExecContext(
			context.Background(),
			`INSERT INTO packaging_profile_components (profile_id, packing_material_item_id, qty_per_unit)
			 VALUES (?, ?, ?)`,
			profileID,
			component.PackingMaterialItemID,
			component.QtyPerUnit,
		)
		if err != nil {
			return err
		}
		componentID, err := componentRes.LastInsertId()
		if err != nil {
			return err
		}
		component.ID = componentID
		component.ProfileID = profileID
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func (r *SqliteInventoryRepository) validatePackingMaterialAssignableTx(tx *sql.Tx, itemID int64) error {
	var matches int
	err := tx.QueryRowContext(
		context.Background(),
		`SELECT COUNT(1)
		 FROM items
		 WHERE id = ? AND is_active = 1 AND item_type = 'PACKING_MATERIAL'`,
		itemID,
	).Scan(&matches)
	if err != nil {
		return err
	}
	if matches == 0 {
		return fmt.Errorf("invalid component type or inactive item: %d", itemID)
	}
	return nil
}

func (r *SqliteInventoryRepository) ListPackagingProfiles(filter domainInventory.PackagingProfileListFilter) ([]domainInventory.PackagingProfile, error) {
	args := make([]any, 0, 5)
	clauses := make([]string, 0, 3)
	if filter.ActiveOnly {
		clauses = append(clauses, "p.is_active = 1")
	}
	if strings.TrimSpace(filter.Search) != "" {
		clauses = append(clauses, "p.name LIKE ?")
		args = append(args, "%"+strings.TrimSpace(filter.Search)+"%")
	}
	if strings.TrimSpace(filter.PackMode) != "" {
		clauses = append(clauses, "p.pack_mode = ?")
		args = append(args, strings.TrimSpace(filter.PackMode))
	}

	query := `SELECT
		p.id,
		p.name,
		p.pack_mode,
		p.is_active,
		p.created_at,
		p.updated_at,
		COALESCE(c.id, 0),
		COALESCE(c.packing_material_item_id, 0),
		COALESCE(c.qty_per_unit, 0)
	FROM packaging_profiles p
	LEFT JOIN packaging_profile_components c ON c.profile_id = p.id`
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY p.name COLLATE NOCASE ASC, c.id ASC"

	rows, err := r.db.QueryContext(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	profileMap := make(map[int64]*domainInventory.PackagingProfile)
	order := make([]int64, 0)
	for rows.Next() {
		var (
			profileID   int64
			name        string
			packMode    string
			isActive    bool
			createdAt   time.Time
			updatedAt   time.Time
			componentID int64
			itemID      int64
			qty         float64
		)
		if err := rows.Scan(
			&profileID,
			&name,
			&packMode,
			&isActive,
			&createdAt,
			&updatedAt,
			&componentID,
			&itemID,
			&qty,
		); err != nil {
			return nil, err
		}

		profile, exists := profileMap[profileID]
		if !exists {
			profile = &domainInventory.PackagingProfile{
				ID:         profileID,
				Name:       name,
				PackMode:   packMode,
				IsActive:   isActive,
				CreatedAt:  createdAt,
				UpdatedAt:  updatedAt,
				Components: make([]domainInventory.PackagingProfileComponent, 0),
			}
			profileMap[profileID] = profile
			order = append(order, profileID)
		}

		if componentID > 0 {
			profile.Components = append(profile.Components, domainInventory.PackagingProfileComponent{
				ID:                    componentID,
				ProfileID:             profileID,
				PackingMaterialItemID: itemID,
				QtyPerUnit:            qty,
			})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	profiles := make([]domainInventory.PackagingProfile, 0, len(order))
	for _, id := range order {
		profiles = append(profiles, *profileMap[id])
	}
	return profiles, nil
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
