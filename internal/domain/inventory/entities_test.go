package inventory

import (
	"errors"
	"testing"
)

func TestItem_ValidateMasterContract_RequiresFieldsAndSupportedType(t *testing.T) {
	tests := []struct {
		name string
		item *Item
		err  error
	}{
		{
			name: "missing name",
			item: &Item{
				ItemType: ItemTypeRaw,
				BaseUnit: "kg",
			},
			err: ErrItemNameRequired,
		},
		{
			name: "missing type",
			item: &Item{
				Name:     "Chili Powder",
				BaseUnit: "kg",
			},
			err: ErrItemTypeRequired,
		},
		{
			name: "unsupported type",
			item: &Item{
				Name:     "Chili Powder",
				ItemType: ItemType("UNKNOWN"),
				BaseUnit: "kg",
			},
			err: ErrUnsupportedItemType,
		},
		{
			name: "missing base unit",
			item: &Item{
				Name:     "Chili Powder",
				ItemType: ItemTypeRaw,
			},
			err: ErrBaseUnitRequired,
		},
		{
			name: "valid contract",
			item: &Item{
				Name:     "Chili Powder",
				ItemType: ItemTypeRaw,
				BaseUnit: "kg",
			},
			err: nil,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			err := tc.item.ValidateMasterContract()
			if tc.err == nil && err != nil {
				t.Fatalf("expected nil error, got %v", err)
			}
			if tc.err != nil && !errors.Is(err, tc.err) {
				t.Fatalf("expected %v, got %v", tc.err, err)
			}
		})
	}
}

func TestItem_ValidateMasterContract_NormalizesLegacyCategoryAndUnit(t *testing.T) {
	item := &Item{
		Name:     "Jar Lid",
		Category: "packing_material",
		Unit:     "pcs",
	}

	if err := item.ValidateMasterContract(); err != nil {
		t.Fatalf("expected validation success from legacy aliases, got %v", err)
	}

	if item.ItemType != ItemTypePackingMaterial {
		t.Fatalf("expected item type %q, got %q", ItemTypePackingMaterial, item.ItemType)
	}
	if item.BaseUnit != "pcs" {
		t.Fatalf("expected base unit pcs, got %q", item.BaseUnit)
	}
}

func TestPackagingProfile_Validate(t *testing.T) {
	valid := &PackagingProfile{
		Name:     "Jar Pack 200g",
		PackMode: "JAR_200G",
		Components: []PackagingProfileComponent{
			{PackingMaterialItemID: 1, QtyPerUnit: 1},
		},
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("expected valid profile, got %v", err)
	}

	invalid := &PackagingProfile{
		Name:     "Invalid",
		PackMode: "TEST",
		Components: []PackagingProfileComponent{
			{PackingMaterialItemID: 0, QtyPerUnit: 0},
		},
	}
	if err := invalid.Validate(); !errors.Is(err, ErrComponentItemID) {
		t.Fatalf("expected component item id error, got %v", err)
	}
}
