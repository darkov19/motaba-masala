package inventory

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
)

var (
	ErrRecipeCodeRequired        = errors.New("recipe_code is required")
	ErrRecipeOutputItemRequired  = errors.New("output_item_id is required")
	ErrRecipeOutputQtyInvalid    = errors.New("output_qty_base must be greater than zero")
	ErrRecipeWastageInvalid      = errors.New("expected_wastage_pct must be between 0 and 100")
	ErrRecipeComponentsRequired  = errors.New("at least one recipe component is required")
	ErrRecipeComponentItemID     = errors.New("input_item_id is required")
	ErrRecipeComponentQtyInvalid = errors.New("input_qty_base must be greater than zero")
	ErrRecipeComponentLineNo     = errors.New("line_no must be greater than zero")
	ErrRecipeComponentLineDup    = errors.New("duplicate line_no in recipe components")
)

type Recipe struct {
	ID                 int64             `json:"id"`
	RecipeCode         string            `json:"recipe_code"`
	OutputItemID       int64             `json:"output_item_id"`
	OutputQtyBase      float64           `json:"output_qty_base"`
	ExpectedWastagePct float64           `json:"expected_wastage_pct"`
	IsActive           bool              `json:"is_active"`
	Components         []RecipeComponent `json:"components"`
	CreatedAt          time.Time         `json:"created_at"`
	UpdatedAt          time.Time         `json:"updated_at"`
}

type RecipeComponent struct {
	ID           int64   `json:"id"`
	RecipeID     int64   `json:"recipe_id"`
	InputItemID  int64   `json:"input_item_id"`
	InputQtyBase float64 `json:"input_qty_base"`
	LineNo       int     `json:"line_no"`
}

func (r *Recipe) Normalize() {
	if r == nil {
		return
	}
	r.RecipeCode = strings.ToUpper(strings.TrimSpace(r.RecipeCode))
	for i := range r.Components {
		if r.Components[i].LineNo <= 0 {
			r.Components[i].LineNo = i + 1
		}
	}
}

func (r *Recipe) Validate() error {
	if r == nil {
		return errors.New("recipe is nil")
	}

	r.Normalize()

	if r.RecipeCode == "" {
		return ErrRecipeCodeRequired
	}
	if r.OutputItemID <= 0 {
		return ErrRecipeOutputItemRequired
	}
	if math.IsNaN(r.OutputQtyBase) || math.IsInf(r.OutputQtyBase, 0) || r.OutputQtyBase <= 0 {
		return ErrRecipeOutputQtyInvalid
	}
	if math.IsNaN(r.ExpectedWastagePct) || math.IsInf(r.ExpectedWastagePct, 0) || r.ExpectedWastagePct < 0 || r.ExpectedWastagePct > 100 {
		return ErrRecipeWastageInvalid
	}
	if len(r.Components) == 0 {
		return ErrRecipeComponentsRequired
	}

	seenLines := make(map[int]struct{}, len(r.Components))
	for _, component := range r.Components {
		if component.LineNo <= 0 {
			return ErrRecipeComponentLineNo
		}
		if _, exists := seenLines[component.LineNo]; exists {
			return fmt.Errorf("%w: %d", ErrRecipeComponentLineDup, component.LineNo)
		}
		seenLines[component.LineNo] = struct{}{}

		if component.InputItemID <= 0 {
			return ErrRecipeComponentItemID
		}
		if math.IsNaN(component.InputQtyBase) || math.IsInf(component.InputQtyBase, 0) || component.InputQtyBase <= 0 {
			return ErrRecipeComponentQtyInvalid
		}
	}

	return nil
}
