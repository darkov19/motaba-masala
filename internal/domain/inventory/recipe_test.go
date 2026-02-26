package inventory

import (
	"errors"
	"testing"
)

func TestRecipe_Validate(t *testing.T) {
	tests := []struct {
		name   string
		recipe *Recipe
		err    error
	}{
		{
			name: "missing recipe code",
			recipe: &Recipe{
				OutputItemID:  10,
				OutputQtyBase: 100,
				Components: []RecipeComponent{
					{InputItemID: 1, InputQtyBase: 50, LineNo: 1},
				},
			},
			err: ErrRecipeCodeRequired,
		},
		{
			name: "missing output item",
			recipe: &Recipe{
				RecipeCode:    "RCP-001",
				OutputQtyBase: 100,
				Components: []RecipeComponent{
					{InputItemID: 1, InputQtyBase: 50, LineNo: 1},
				},
			},
			err: ErrRecipeOutputItemRequired,
		},
		{
			name: "missing components",
			recipe: &Recipe{
				RecipeCode:    "RCP-001",
				OutputItemID:  10,
				OutputQtyBase: 100,
			},
			err: ErrRecipeComponentsRequired,
		},
		{
			name: "duplicate line numbers",
			recipe: &Recipe{
				RecipeCode:    "RCP-001",
				OutputItemID:  10,
				OutputQtyBase: 100,
				Components: []RecipeComponent{
					{InputItemID: 1, InputQtyBase: 50, LineNo: 1},
					{InputItemID: 2, InputQtyBase: 30, LineNo: 1},
				},
			},
			err: ErrRecipeComponentLineDup,
		},
		{
			name: "valid recipe",
			recipe: &Recipe{
				RecipeCode:         " rcp-001 ",
				OutputItemID:       10,
				OutputQtyBase:      100,
				ExpectedWastagePct: 2.5,
				Components: []RecipeComponent{
					{InputItemID: 1, InputQtyBase: 50},
					{InputItemID: 2, InputQtyBase: 49},
				},
			},
			err: nil,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			err := tc.recipe.Validate()
			if tc.err == nil {
				if err != nil {
					t.Fatalf("expected nil error, got %v", err)
				}
				if tc.recipe.RecipeCode != "RCP-001" {
					t.Fatalf("expected normalized recipe code, got %q", tc.recipe.RecipeCode)
				}
				if tc.recipe.Components[0].LineNo != 1 || tc.recipe.Components[1].LineNo != 2 {
					t.Fatalf("expected auto line numbering 1..N, got %+v", tc.recipe.Components)
				}
				return
			}
			if !errors.Is(err, tc.err) {
				t.Fatalf("expected %v, got %v", tc.err, err)
			}
		})
	}
}
