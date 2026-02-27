package inventory

import (
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
)

type PartyType string

const (
	PartyTypeSupplier PartyType = "SUPPLIER"
	PartyTypeCustomer PartyType = "CUSTOMER"
)

var (
	ErrPartyTypeRequired       = errors.New("party_type is required")
	ErrPartyTypeUnsupported    = errors.New("unsupported party_type")
	ErrPartyNameRequired       = errors.New("party name is required")
	ErrPartyContactRequired    = errors.New("at least one contact field is required")
	ErrPartyEmailInvalid       = errors.New("email is invalid")
	ErrPartyLeadTimeInvalid    = errors.New("lead_time_days must be greater than or equal to zero")
	ErrPartyLeadTimeDisallowed = errors.New("lead_time_days is only supported for suppliers")
)

func ParsePartyType(value string) PartyType {
	return PartyType(strings.ToUpper(strings.TrimSpace(value)))
}

func (t PartyType) IsSupported() bool {
	switch t {
	case PartyTypeSupplier, PartyTypeCustomer:
		return true
	default:
		return false
	}
}

type Party struct {
	ID           int64     `json:"id"`
	PartyType    PartyType `json:"party_type"`
	Name         string    `json:"name"`
	Phone        string    `json:"phone"`
	Email        string    `json:"email"`
	Address      string    `json:"address"`
	LeadTimeDays *int      `json:"lead_time_days,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (p *Party) Normalize() {
	if p == nil {
		return
	}

	p.Name = strings.TrimSpace(p.Name)
	p.Phone = strings.TrimSpace(p.Phone)
	p.Email = strings.TrimSpace(p.Email)
	p.Address = strings.TrimSpace(p.Address)
}

func (p *Party) Validate() error {
	if p == nil {
		return errors.New("party is nil")
	}

	p.Normalize()

	if p.PartyType == "" {
		return ErrPartyTypeRequired
	}
	if !p.PartyType.IsSupported() {
		return fmt.Errorf("%w: %s", ErrPartyTypeUnsupported, p.PartyType)
	}
	if p.Name == "" {
		return ErrPartyNameRequired
	}
	if p.Phone == "" && p.Email == "" && p.Address == "" {
		return ErrPartyContactRequired
	}
	if p.Email != "" {
		if _, err := mail.ParseAddress(p.Email); err != nil {
			return ErrPartyEmailInvalid
		}
	}
	if p.LeadTimeDays != nil {
		if *p.LeadTimeDays < 0 {
			return ErrPartyLeadTimeInvalid
		}
		if p.PartyType != PartyTypeSupplier {
			return ErrPartyLeadTimeDisallowed
		}
	}

	return nil
}
