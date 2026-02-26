package inventory

import (
	"errors"
	"fmt"
	"math"
	"math/big"
	"strconv"
	"strings"
	"time"
)

type RoundingMode string

const (
	RoundingModeHalfUp RoundingMode = "HALF_UP"
	RoundingModeDown   RoundingMode = "DOWN"
	RoundingModeUp     RoundingMode = "UP"
)

var (
	ErrConversionFromUnitRequired  = errors.New("from_unit is required")
	ErrConversionToUnitRequired    = errors.New("to_unit is required")
	ErrConversionSourceUnitMissing = errors.New("source_unit is required")
	ErrConversionTargetUnitMissing = errors.New("target_unit is required")
	ErrConversionQuantityInvalid   = errors.New("quantity must be a finite number")
	ErrConversionFactorInvalid     = errors.New("factor must be greater than zero")
	ErrConversionPrecisionInvalid  = errors.New("precision_scale must be between 0 and 12")
	ErrConversionRoundingInvalid   = errors.New("rounding_mode must be one of HALF_UP, DOWN, or UP")
	ErrConversionItemIDInvalid     = errors.New("item_id must be greater than zero when provided")
	ErrConversionRuleNotFound      = errors.New("conversion rule not found")
	ErrConversionRuleMismatch      = errors.New("conversion rule does not match requested units")
)

func ParseRoundingMode(value string) RoundingMode {
	return RoundingMode(strings.ToUpper(strings.TrimSpace(value)))
}

func (r RoundingMode) IsSupported() bool {
	switch r {
	case RoundingModeHalfUp, RoundingModeDown, RoundingModeUp:
		return true
	default:
		return false
	}
}

type UnitConversionRule struct {
	ID             int64        `json:"id"`
	ItemID         *int64       `json:"item_id,omitempty"`
	FromUnit       string       `json:"from_unit"`
	ToUnit         string       `json:"to_unit"`
	Factor         float64      `json:"factor"`
	PrecisionScale int          `json:"precision_scale"`
	RoundingMode   RoundingMode `json:"rounding_mode"`
	IsActive       bool         `json:"is_active"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

func (r *UnitConversionRule) Normalize() {
	if r == nil {
		return
	}
	r.FromUnit = strings.ToUpper(strings.TrimSpace(r.FromUnit))
	r.ToUnit = strings.ToUpper(strings.TrimSpace(r.ToUnit))
	r.RoundingMode = ParseRoundingMode(string(r.RoundingMode))
	if r.RoundingMode == "" {
		r.RoundingMode = RoundingModeHalfUp
	}
	if r.ItemID != nil && *r.ItemID <= 0 {
		r.ItemID = nil
	}
}

func (r *UnitConversionRule) Validate() error {
	if r == nil {
		return errors.New("conversion rule is nil")
	}
	r.Normalize()
	if r.FromUnit == "" {
		return ErrConversionFromUnitRequired
	}
	if r.ToUnit == "" {
		return ErrConversionToUnitRequired
	}
	if math.IsNaN(r.Factor) || math.IsInf(r.Factor, 0) || r.Factor <= 0 {
		return ErrConversionFactorInvalid
	}
	if r.PrecisionScale < 0 || r.PrecisionScale > 12 {
		return ErrConversionPrecisionInvalid
	}
	if !r.RoundingMode.IsSupported() {
		return ErrConversionRoundingInvalid
	}
	if r.ItemID != nil && *r.ItemID <= 0 {
		return ErrConversionItemIDInvalid
	}
	return nil
}

type UnitConversionLookup struct {
	ItemID   *int64
	FromUnit string
	ToUnit   string
}

func (l *UnitConversionLookup) Normalize() {
	if l == nil {
		return
	}
	l.FromUnit = strings.ToUpper(strings.TrimSpace(l.FromUnit))
	l.ToUnit = strings.ToUpper(strings.TrimSpace(l.ToUnit))
	if l.ItemID != nil && *l.ItemID <= 0 {
		l.ItemID = nil
	}
}

func (l *UnitConversionLookup) Validate() error {
	if l == nil {
		return errors.New("conversion lookup is nil")
	}
	l.Normalize()
	if l.FromUnit == "" {
		return ErrConversionFromUnitRequired
	}
	if l.ToUnit == "" {
		return ErrConversionToUnitRequired
	}
	if l.ItemID != nil && *l.ItemID <= 0 {
		return ErrConversionItemIDInvalid
	}
	return nil
}

type UnitConversionRuleFilter struct {
	ItemID     *int64
	FromUnit   string
	ToUnit     string
	ActiveOnly bool
}

func (f *UnitConversionRuleFilter) Normalize() {
	if f == nil {
		return
	}
	f.FromUnit = strings.ToUpper(strings.TrimSpace(f.FromUnit))
	f.ToUnit = strings.ToUpper(strings.TrimSpace(f.ToUnit))
	if f.ItemID != nil && *f.ItemID <= 0 {
		f.ItemID = nil
	}
}

type UnitConversionRequest struct {
	ItemID     *int64
	Quantity   float64
	SourceUnit string
	TargetUnit string
}

func (r *UnitConversionRequest) Normalize() {
	if r == nil {
		return
	}
	r.SourceUnit = strings.ToUpper(strings.TrimSpace(r.SourceUnit))
	r.TargetUnit = strings.ToUpper(strings.TrimSpace(r.TargetUnit))
	if r.ItemID != nil && *r.ItemID <= 0 {
		r.ItemID = nil
	}
}

func (r *UnitConversionRequest) Validate() error {
	if r == nil {
		return errors.New("conversion request is nil")
	}
	r.Normalize()
	if r.SourceUnit == "" {
		return ErrConversionSourceUnitMissing
	}
	if r.TargetUnit == "" {
		return ErrConversionTargetUnitMissing
	}
	if math.IsNaN(r.Quantity) || math.IsInf(r.Quantity, 0) {
		return ErrConversionQuantityInvalid
	}
	if r.ItemID != nil && *r.ItemID <= 0 {
		return ErrConversionItemIDInvalid
	}
	return nil
}

type ConversionPrecisionMeta struct {
	Scale        int    `json:"scale"`
	RoundingMode string `json:"rounding_mode"`
}

type UnitConversionResult struct {
	QtyConverted float64                 `json:"qty_converted"`
	Precision    ConversionPrecisionMeta `json:"precision_meta"`
	SourceUnit   string                  `json:"source_unit"`
	TargetUnit   string                  `json:"target_unit"`
	Factor       float64                 `json:"factor"`
}

func ApplyUnitConversion(request UnitConversionRequest, rule UnitConversionRule) (UnitConversionResult, error) {
	if err := request.Validate(); err != nil {
		return UnitConversionResult{}, err
	}
	if err := rule.Validate(); err != nil {
		return UnitConversionResult{}, err
	}
	if !rule.IsActive {
		return UnitConversionResult{}, ErrConversionRuleNotFound
	}
	if request.SourceUnit != rule.FromUnit || request.TargetUnit != rule.ToUnit {
		return UnitConversionResult{}, fmt.Errorf("%w: %s->%s (rule %s->%s)", ErrConversionRuleMismatch, request.SourceUnit, request.TargetUnit, rule.FromUnit, rule.ToUnit)
	}

	quantityRat, err := decimalFloatToRat(request.Quantity)
	if err != nil {
		return UnitConversionResult{}, err
	}
	factorRat, err := decimalFloatToRat(rule.Factor)
	if err != nil {
		return UnitConversionResult{}, err
	}
	raw := new(big.Rat).Mul(quantityRat, factorRat)
	rounded := roundRat(raw, rule.PrecisionScale, rule.RoundingMode)

	converted, _ := rounded.Float64()
	return UnitConversionResult{
		QtyConverted: converted,
		Precision: ConversionPrecisionMeta{
			Scale:        rule.PrecisionScale,
			RoundingMode: string(rule.RoundingMode),
		},
		SourceUnit: request.SourceUnit,
		TargetUnit: request.TargetUnit,
		Factor:     rule.Factor,
	}, nil
}

func decimalFloatToRat(value float64) (*big.Rat, error) {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return nil, ErrConversionQuantityInvalid
	}
	raw := strconv.FormatFloat(value, 'f', -1, 64)
	rat, ok := new(big.Rat).SetString(raw)
	if !ok {
		return nil, fmt.Errorf("invalid decimal value %q", raw)
	}
	return rat, nil
}

func roundRat(value *big.Rat, scale int, mode RoundingMode) *big.Rat {
	if value == nil {
		return new(big.Rat)
	}

	multiplier := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(scale)), nil)
	multiplierRat := new(big.Rat).SetInt(multiplier)
	scaled := new(big.Rat).Mul(value, multiplierRat)

	quotient := new(big.Int)
	remainder := new(big.Int)
	quotient.QuoRem(scaled.Num(), scaled.Denom(), remainder)

	if remainder.Sign() != 0 {
		switch mode {
		case RoundingModeUp:
			adjustAwayFromZero(quotient, scaled.Sign())
		case RoundingModeHalfUp:
			absRemainder := new(big.Int).Abs(remainder)
			twiceRemainder := new(big.Int).Mul(absRemainder, big.NewInt(2))
			if twiceRemainder.Cmp(scaled.Denom()) >= 0 {
				adjustAwayFromZero(quotient, scaled.Sign())
			}
		case RoundingModeDown:
			// toward zero; quotient is already truncated toward zero.
		}
	}

	return new(big.Rat).Quo(new(big.Rat).SetInt(quotient), multiplierRat)
}

func adjustAwayFromZero(value *big.Int, sign int) {
	if sign < 0 {
		value.Sub(value, big.NewInt(1))
		return
	}
	value.Add(value, big.NewInt(1))
}
