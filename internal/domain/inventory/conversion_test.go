package inventory

import (
	"errors"
	"math"
	"testing"
)

func TestUnitConversionRule_Validate(t *testing.T) {
	tests := []struct {
		name string
		rule UnitConversionRule
		err  error
	}{
		{
			name: "missing from unit",
			rule: UnitConversionRule{
				ToUnit:         "KG",
				Factor:         0.001,
				PrecisionScale: 4,
				RoundingMode:   RoundingModeHalfUp,
				IsActive:       true,
			},
			err: ErrConversionFromUnitRequired,
		},
		{
			name: "missing to unit",
			rule: UnitConversionRule{
				FromUnit:       "GRAM",
				Factor:         0.001,
				PrecisionScale: 4,
				RoundingMode:   RoundingModeHalfUp,
				IsActive:       true,
			},
			err: ErrConversionToUnitRequired,
		},
		{
			name: "invalid factor",
			rule: UnitConversionRule{
				FromUnit:       "GRAM",
				ToUnit:         "KG",
				Factor:         0,
				PrecisionScale: 4,
				RoundingMode:   RoundingModeHalfUp,
				IsActive:       true,
			},
			err: ErrConversionFactorInvalid,
		},
		{
			name: "invalid precision",
			rule: UnitConversionRule{
				FromUnit:       "GRAM",
				ToUnit:         "KG",
				Factor:         0.001,
				PrecisionScale: 13,
				RoundingMode:   RoundingModeHalfUp,
				IsActive:       true,
			},
			err: ErrConversionPrecisionInvalid,
		},
		{
			name: "invalid rounding mode",
			rule: UnitConversionRule{
				FromUnit:       "GRAM",
				ToUnit:         "KG",
				Factor:         0.001,
				PrecisionScale: 4,
				RoundingMode:   RoundingMode("BANKERS"),
				IsActive:       true,
			},
			err: ErrConversionRoundingInvalid,
		},
		{
			name: "valid rule",
			rule: UnitConversionRule{
				FromUnit:       " gram ",
				ToUnit:         "kg",
				Factor:         0.001,
				PrecisionScale: 4,
				RoundingMode:   RoundingModeHalfUp,
				IsActive:       true,
			},
			err: nil,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			err := tc.rule.Validate()
			if tc.err == nil {
				if err != nil {
					t.Fatalf("expected nil error, got %v", err)
				}
				if tc.rule.FromUnit != "GRAM" || tc.rule.ToUnit != "KG" {
					t.Fatalf("expected normalized units GRAM->KG, got %s->%s", tc.rule.FromUnit, tc.rule.ToUnit)
				}
				return
			}
			if !errors.Is(err, tc.err) {
				t.Fatalf("expected %v, got %v", tc.err, err)
			}
		})
	}
}

func TestApplyUnitConversion_DeterministicRoundingModes(t *testing.T) {
	req := UnitConversionRequest{
		Quantity:   500,
		SourceUnit: "gram",
		TargetUnit: "kg",
	}
	rule := UnitConversionRule{
		FromUnit:       "GRAM",
		ToUnit:         "KG",
		Factor:         0.001,
		PrecisionScale: 4,
		RoundingMode:   RoundingModeHalfUp,
		IsActive:       true,
	}
	result, err := ApplyUnitConversion(req, rule)
	if err != nil {
		t.Fatalf("ApplyUnitConversion failed: %v", err)
	}
	if math.Abs(result.QtyConverted-0.5) > 1e-9 {
		t.Fatalf("expected 0.5, got %f", result.QtyConverted)
	}
	if result.Precision.Scale != 4 || result.Precision.RoundingMode != string(RoundingModeHalfUp) {
		t.Fatalf("unexpected precision metadata: %+v", result.Precision)
	}

	roundingCases := []struct {
		mode     RoundingMode
		expected float64
	}{
		{mode: RoundingModeHalfUp, expected: 1.01},
		{mode: RoundingModeDown, expected: 1.00},
		{mode: RoundingModeUp, expected: 1.01},
	}
	for _, tc := range roundingCases {
		tc := tc
		t.Run(string(tc.mode), func(t *testing.T) {
			res, err := ApplyUnitConversion(
				UnitConversionRequest{
					Quantity:   1.005,
					SourceUnit: "GRAM",
					TargetUnit: "KG",
				},
				UnitConversionRule{
					FromUnit:       "GRAM",
					ToUnit:         "KG",
					Factor:         1,
					PrecisionScale: 2,
					RoundingMode:   tc.mode,
					IsActive:       true,
				},
			)
			if err != nil {
				t.Fatalf("ApplyUnitConversion failed: %v", err)
			}
			if math.Abs(res.QtyConverted-tc.expected) > 1e-9 {
				t.Fatalf("expected %f, got %f", tc.expected, res.QtyConverted)
			}
		})
	}
}
