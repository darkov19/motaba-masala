package db

import (
	"context"
	"database/sql"
	"errors"
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

func (r *SqliteInventoryRepository) validateRecipeOutputItemTx(tx *sql.Tx, itemID int64) error {
	var matches int
	err := tx.QueryRowContext(
		context.Background(),
		`SELECT COUNT(1)
		 FROM items
		 WHERE id = ? AND is_active = 1 AND item_type = 'BULK_POWDER'`,
		itemID,
	).Scan(&matches)
	if err != nil {
		return err
	}
	if matches == 0 {
		return fmt.Errorf("invalid output item type or inactive item: %d", itemID)
	}
	return nil
}

func (r *SqliteInventoryRepository) validateRecipeComponentItemTx(tx *sql.Tx, itemID int64) error {
	var matches int
	err := tx.QueryRowContext(
		context.Background(),
		`SELECT COUNT(1)
		 FROM items
		 WHERE id = ? AND is_active = 1`,
		itemID,
	).Scan(&matches)
	if err != nil {
		return err
	}
	if matches == 0 {
		return fmt.Errorf("invalid recipe component item: %d", itemID)
	}
	return nil
}

func (r *SqliteInventoryRepository) CreateRecipe(recipe *domainInventory.Recipe) error {
	if err := recipe.Validate(); err != nil {
		return err
	}
	if recipe.CreatedAt.IsZero() {
		recipe.CreatedAt = time.Now().UTC()
	}
	if recipe.UpdatedAt.IsZero() {
		recipe.UpdatedAt = recipe.CreatedAt
	}

	tx, err := r.db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if err := r.validateRecipeOutputItemTx(tx, recipe.OutputItemID); err != nil {
		return err
	}

	res, err := tx.ExecContext(
		context.Background(),
		`INSERT INTO recipes (recipe_code, output_item_id, output_qty_base, expected_wastage_pct, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		recipe.RecipeCode,
		recipe.OutputItemID,
		recipe.OutputQtyBase,
		recipe.ExpectedWastagePct,
		recipe.IsActive,
		recipe.CreatedAt,
		recipe.UpdatedAt,
	)
	if err != nil {
		return err
	}
	recipeID, err := res.LastInsertId()
	if err != nil {
		return err
	}
	recipe.ID = recipeID

	for i := range recipe.Components {
		component := &recipe.Components[i]
		if err := r.validateRecipeComponentItemTx(tx, component.InputItemID); err != nil {
			return err
		}
		componentRes, err := tx.ExecContext(
			context.Background(),
			`INSERT INTO recipe_components (recipe_id, input_item_id, input_qty_base, line_no)
			 VALUES (?, ?, ?, ?)`,
			recipeID,
			component.InputItemID,
			component.InputQtyBase,
			component.LineNo,
		)
		if err != nil {
			return err
		}
		componentID, err := componentRes.LastInsertId()
		if err != nil {
			return err
		}
		component.ID = componentID
		component.RecipeID = recipeID
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true
	return nil
}

func (r *SqliteInventoryRepository) UpdateRecipe(recipe *domainInventory.Recipe) error {
	if recipe == nil || recipe.ID <= 0 {
		return errors.New("recipe id is required")
	}
	if err := recipe.Validate(); err != nil {
		return err
	}

	tx, err := r.db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if err := r.validateRecipeOutputItemTx(tx, recipe.OutputItemID); err != nil {
		return err
	}

	res, err := tx.ExecContext(
		context.Background(),
		`UPDATE recipes
		 SET recipe_code = ?, output_item_id = ?, output_qty_base = ?, expected_wastage_pct = ?, is_active = ?, updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
		 WHERE id = ? AND updated_at = ?`,
		recipe.RecipeCode,
		recipe.OutputItemID,
		recipe.OutputQtyBase,
		recipe.ExpectedWastagePct,
		recipe.IsActive,
		recipe.ID,
		recipe.UpdatedAt,
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

	if _, err := tx.ExecContext(context.Background(), "DELETE FROM recipe_components WHERE recipe_id = ?", recipe.ID); err != nil {
		return err
	}

	for i := range recipe.Components {
		component := &recipe.Components[i]
		if err := r.validateRecipeComponentItemTx(tx, component.InputItemID); err != nil {
			return err
		}
		componentRes, err := tx.ExecContext(
			context.Background(),
			`INSERT INTO recipe_components (recipe_id, input_item_id, input_qty_base, line_no)
			 VALUES (?, ?, ?, ?)`,
			recipe.ID,
			component.InputItemID,
			component.InputQtyBase,
			component.LineNo,
		)
		if err != nil {
			return err
		}
		componentID, err := componentRes.LastInsertId()
		if err != nil {
			return err
		}
		component.ID = componentID
		component.RecipeID = recipe.ID
	}

	if err := tx.QueryRowContext(context.Background(), "SELECT updated_at FROM recipes WHERE id = ?", recipe.ID).Scan(&recipe.UpdatedAt); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true
	return nil
}

func (r *SqliteInventoryRepository) ListRecipes(filter domainInventory.RecipeListFilter) ([]domainInventory.Recipe, error) {
	args := make([]any, 0, 5)
	clauses := make([]string, 0, 4)
	if filter.ActiveOnly {
		clauses = append(clauses, "r.is_active = 1")
	}
	if filter.OutputItemID != nil && *filter.OutputItemID > 0 {
		clauses = append(clauses, "r.output_item_id = ?")
		args = append(args, *filter.OutputItemID)
	}
	if strings.TrimSpace(filter.Search) != "" {
		query := "%" + strings.TrimSpace(filter.Search) + "%"
		clauses = append(clauses, "(r.recipe_code LIKE ? OR oi.name LIKE ?)")
		args = append(args, query, query)
	}

	query := `SELECT
		r.id,
		r.recipe_code,
		r.output_item_id,
		r.output_qty_base,
		r.expected_wastage_pct,
		r.is_active,
		r.created_at,
		r.updated_at,
		COALESCE(c.id, 0),
		COALESCE(c.input_item_id, 0),
		COALESCE(c.input_qty_base, 0),
		COALESCE(c.line_no, 0)
	FROM recipes r
	INNER JOIN items oi ON oi.id = r.output_item_id
	LEFT JOIN recipe_components c ON c.recipe_id = r.id`
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY r.recipe_code COLLATE NOCASE ASC, c.line_no ASC"

	rows, err := r.db.QueryContext(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipeMap := make(map[int64]*domainInventory.Recipe)
	order := make([]int64, 0)
	for rows.Next() {
		var (
			recipeID      int64
			recipeCode    string
			outputItemID  int64
			outputQtyBase float64
			wastage       float64
			isActive      bool
			createdAt     time.Time
			updatedAt     time.Time
			componentID   int64
			inputItemID   int64
			inputQtyBase  float64
			lineNo        int
		)
		if err := rows.Scan(
			&recipeID,
			&recipeCode,
			&outputItemID,
			&outputQtyBase,
			&wastage,
			&isActive,
			&createdAt,
			&updatedAt,
			&componentID,
			&inputItemID,
			&inputQtyBase,
			&lineNo,
		); err != nil {
			return nil, err
		}

		recipe, exists := recipeMap[recipeID]
		if !exists {
			recipe = &domainInventory.Recipe{
				ID:                 recipeID,
				RecipeCode:         recipeCode,
				OutputItemID:       outputItemID,
				OutputQtyBase:      outputQtyBase,
				ExpectedWastagePct: wastage,
				IsActive:           isActive,
				CreatedAt:          createdAt,
				UpdatedAt:          updatedAt,
				Components:         make([]domainInventory.RecipeComponent, 0),
			}
			recipeMap[recipeID] = recipe
			order = append(order, recipeID)
		}
		if componentID > 0 {
			recipe.Components = append(recipe.Components, domainInventory.RecipeComponent{
				ID:           componentID,
				RecipeID:     recipeID,
				InputItemID:  inputItemID,
				InputQtyBase: inputQtyBase,
				LineNo:       lineNo,
			})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	recipes := make([]domainInventory.Recipe, 0, len(order))
	for _, id := range order {
		recipes = append(recipes, *recipeMap[id])
	}
	return recipes, nil
}

func normalizeOptionalLeadTime(leadTimeDays *int) interface{} {
	if leadTimeDays == nil {
		return nil
	}
	return *leadTimeDays
}

func (r *SqliteInventoryRepository) CreateParty(party *domainInventory.Party) error {
	if err := party.Validate(); err != nil {
		return err
	}
	if party.CreatedAt.IsZero() {
		party.CreatedAt = time.Now().UTC()
	}
	if party.UpdatedAt.IsZero() {
		party.UpdatedAt = party.CreatedAt
	}

	tx, err := r.db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	res, err := tx.ExecContext(
		context.Background(),
		`INSERT INTO parties (party_type, name, phone, email, address, lead_time_days, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		string(party.PartyType),
		party.Name,
		party.Phone,
		party.Email,
		party.Address,
		normalizeOptionalLeadTime(party.LeadTimeDays),
		party.IsActive,
		party.CreatedAt,
		party.UpdatedAt,
	)
	if err != nil {
		return err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	party.ID = id

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true
	return nil
}

func (r *SqliteInventoryRepository) UpdateParty(party *domainInventory.Party) error {
	if party == nil || party.ID <= 0 {
		return errors.New("party id is required")
	}
	if err := party.Validate(); err != nil {
		return err
	}

	tx, err := r.db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	res, err := tx.ExecContext(
		context.Background(),
		`UPDATE parties
		 SET party_type = ?, name = ?, phone = ?, email = ?, address = ?, lead_time_days = ?, is_active = ?, updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
		 WHERE id = ? AND updated_at = ?`,
		string(party.PartyType),
		party.Name,
		party.Phone,
		party.Email,
		party.Address,
		normalizeOptionalLeadTime(party.LeadTimeDays),
		party.IsActive,
		party.ID,
		party.UpdatedAt,
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

	if err := tx.QueryRowContext(context.Background(), "SELECT updated_at FROM parties WHERE id = ?", party.ID).Scan(&party.UpdatedAt); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true
	return nil
}

func (r *SqliteInventoryRepository) ListParties(filter domainInventory.PartyListFilter) ([]domainInventory.Party, error) {
	args := make([]any, 0, 4)
	clauses := make([]string, 0, 3)
	if filter.ActiveOnly {
		clauses = append(clauses, "is_active = 1")
	}
	if filter.PartyType != "" {
		clauses = append(clauses, "party_type = ?")
		args = append(args, string(filter.PartyType))
	}
	if strings.TrimSpace(filter.Search) != "" {
		search := "%" + strings.TrimSpace(filter.Search) + "%"
		clauses = append(clauses, "(name LIKE ? OR phone LIKE ? OR email LIKE ?)")
		args = append(args, search, search, search)
	}

	query := `SELECT id, party_type, name, phone, email, address, lead_time_days, is_active, created_at, updated_at
		FROM parties`
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY name COLLATE NOCASE ASC"

	rows, err := r.db.QueryContext(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	parties := make([]domainInventory.Party, 0)
	for rows.Next() {
		var (
			partyType    string
			leadTimeDays sql.NullInt64
			party        domainInventory.Party
		)
		if err := rows.Scan(
			&party.ID,
			&partyType,
			&party.Name,
			&party.Phone,
			&party.Email,
			&party.Address,
			&leadTimeDays,
			&party.IsActive,
			&party.CreatedAt,
			&party.UpdatedAt,
		); err != nil {
			return nil, err
		}
		party.PartyType = domainInventory.ParsePartyType(partyType)
		if leadTimeDays.Valid {
			lead := int(leadTimeDays.Int64)
			party.LeadTimeDays = &lead
		}
		party.Normalize()
		parties = append(parties, party)
	}
	return parties, rows.Err()
}

func normalizeOptionalItemID(itemID *int64) interface{} {
	if itemID == nil || *itemID <= 0 {
		return nil
	}
	return *itemID
}

func (r *SqliteInventoryRepository) CreateUnitConversionRule(rule *domainInventory.UnitConversionRule) error {
	if err := rule.Validate(); err != nil {
		return err
	}
	if rule.CreatedAt.IsZero() {
		rule.CreatedAt = time.Now().UTC()
	}
	if rule.UpdatedAt.IsZero() {
		rule.UpdatedAt = rule.CreatedAt
	}

	result, err := r.db.ExecContext(
		context.Background(),
		`INSERT INTO unit_conversions (item_id, from_unit, to_unit, factor, precision_scale, rounding_mode, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		normalizeOptionalItemID(rule.ItemID),
		rule.FromUnit,
		rule.ToUnit,
		rule.Factor,
		rule.PrecisionScale,
		string(rule.RoundingMode),
		rule.IsActive,
		rule.CreatedAt,
		rule.UpdatedAt,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	rule.ID = id
	return nil
}

func (r *SqliteInventoryRepository) FindUnitConversionRule(lookup domainInventory.UnitConversionLookup) (*domainInventory.UnitConversionRule, error) {
	if err := lookup.Validate(); err != nil {
		return nil, err
	}

	var (
		row *sql.Row
	)
	if lookup.ItemID != nil && *lookup.ItemID > 0 {
		row = r.db.QueryRowContext(
			context.Background(),
			`SELECT id, item_id, from_unit, to_unit, factor, precision_scale, rounding_mode, is_active, created_at, updated_at
			 FROM unit_conversions
			 WHERE from_unit = ? AND to_unit = ? AND is_active = 1 AND (item_id = ? OR item_id IS NULL)
			 ORDER BY CASE WHEN item_id = ? THEN 0 ELSE 1 END, id ASC
			 LIMIT 1`,
			lookup.FromUnit,
			lookup.ToUnit,
			*lookup.ItemID,
			*lookup.ItemID,
		)
	} else {
		row = r.db.QueryRowContext(
			context.Background(),
			`SELECT id, item_id, from_unit, to_unit, factor, precision_scale, rounding_mode, is_active, created_at, updated_at
			 FROM unit_conversions
			 WHERE from_unit = ? AND to_unit = ? AND is_active = 1 AND item_id IS NULL
			 ORDER BY id ASC
			 LIMIT 1`,
			lookup.FromUnit,
			lookup.ToUnit,
		)
	}

	var (
		rule         domainInventory.UnitConversionRule
		itemID       sql.NullInt64
		roundingMode string
	)
	if err := row.Scan(
		&rule.ID,
		&itemID,
		&rule.FromUnit,
		&rule.ToUnit,
		&rule.Factor,
		&rule.PrecisionScale,
		&roundingMode,
		&rule.IsActive,
		&rule.CreatedAt,
		&rule.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domainInventory.ErrConversionRuleNotFound
		}
		return nil, err
	}
	if itemID.Valid {
		id := itemID.Int64
		rule.ItemID = &id
	}
	rule.RoundingMode = domainInventory.ParseRoundingMode(roundingMode)
	rule.Normalize()
	return &rule, nil
}

func (r *SqliteInventoryRepository) ListUnitConversionRules(filter domainInventory.UnitConversionRuleFilter) ([]domainInventory.UnitConversionRule, error) {
	filter.Normalize()

	args := make([]interface{}, 0, 5)
	clauses := make([]string, 0, 4)
	if filter.ActiveOnly {
		clauses = append(clauses, "is_active = 1")
	}
	if filter.ItemID != nil && *filter.ItemID > 0 {
		clauses = append(clauses, "item_id = ?")
		args = append(args, *filter.ItemID)
	}
	if filter.FromUnit != "" {
		clauses = append(clauses, "from_unit = ?")
		args = append(args, filter.FromUnit)
	}
	if filter.ToUnit != "" {
		clauses = append(clauses, "to_unit = ?")
		args = append(args, filter.ToUnit)
	}

	query := `SELECT id, item_id, from_unit, to_unit, factor, precision_scale, rounding_mode, is_active, created_at, updated_at
		FROM unit_conversions`
	if len(clauses) > 0 {
		query += " WHERE " + strings.Join(clauses, " AND ")
	}
	query += " ORDER BY CASE WHEN item_id IS NULL THEN 1 ELSE 0 END, item_id, from_unit, to_unit"

	rows, err := r.db.QueryContext(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rules := make([]domainInventory.UnitConversionRule, 0)
	for rows.Next() {
		var (
			rule         domainInventory.UnitConversionRule
			itemID       sql.NullInt64
			roundingMode string
		)
		if err := rows.Scan(
			&rule.ID,
			&itemID,
			&rule.FromUnit,
			&rule.ToUnit,
			&rule.Factor,
			&rule.PrecisionScale,
			&roundingMode,
			&rule.IsActive,
			&rule.CreatedAt,
			&rule.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if itemID.Valid {
			id := itemID.Int64
			rule.ItemID = &id
		}
		rule.RoundingMode = domainInventory.ParseRoundingMode(roundingMode)
		rule.Normalize()
		rules = append(rules, rule)
	}

	return rules, rows.Err()
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
