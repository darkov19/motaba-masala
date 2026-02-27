package inventory

import (
	"errors"
	"testing"
)

func TestPartyValidate(t *testing.T) {
	lead := 5
	cases := []struct {
		name  string
		party *Party
		err   error
	}{
		{
			name: "missing type",
			party: &Party{
				Name:     "Acme Supplies",
				Phone:    "9998887777",
				IsActive: true,
			},
			err: ErrPartyTypeRequired,
		},
		{
			name: "unsupported type",
			party: &Party{
				PartyType: PartyType("vendor"),
				Name:      "Acme Supplies",
				Phone:     "9998887777",
				IsActive:  true,
			},
			err: ErrPartyTypeUnsupported,
		},
		{
			name: "missing name",
			party: &Party{
				PartyType: PartyTypeSupplier,
				Phone:     "9998887777",
				IsActive:  true,
			},
			err: ErrPartyNameRequired,
		},
		{
			name: "missing contact",
			party: &Party{
				PartyType: PartyTypeSupplier,
				Name:      "Acme Supplies",
				IsActive:  true,
			},
			err: ErrPartyContactRequired,
		},
		{
			name: "invalid email",
			party: &Party{
				PartyType: PartyTypeSupplier,
				Name:      "Acme Supplies",
				Email:     "not-an-email",
				IsActive:  true,
			},
			err: ErrPartyEmailInvalid,
		},
		{
			name: "negative lead time",
			party: &Party{
				PartyType:    PartyTypeSupplier,
				Name:         "Acme Supplies",
				Phone:        "9998887777",
				LeadTimeDays: ptrInt(-1),
				IsActive:     true,
			},
			err: ErrPartyLeadTimeInvalid,
		},
		{
			name: "lead time disallowed for customer",
			party: &Party{
				PartyType:    PartyTypeCustomer,
				Name:         "Metro Distributor",
				Phone:        "9998887777",
				LeadTimeDays: ptrInt(3),
				IsActive:     true,
			},
			err: ErrPartyLeadTimeDisallowed,
		},
		{
			name: "valid supplier",
			party: &Party{
				PartyType:    PartyTypeSupplier,
				Name:         "  Acme Supplies ",
				Phone:        " 9998887777 ",
				Email:        " supplier@example.com ",
				Address:      " 10 Market Road ",
				LeadTimeDays: &lead,
				IsActive:     true,
			},
		},
		{
			name: "valid customer with email only",
			party: &Party{
				PartyType: PartyTypeCustomer,
				Name:      "Metro Distributor",
				Email:     "metro@example.com",
				IsActive:  true,
			},
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			err := tc.party.Validate()
			if tc.err == nil {
				if err != nil {
					t.Fatalf("expected nil error, got %v", err)
				}
				return
			}
			if !errors.Is(err, tc.err) {
				t.Fatalf("expected %v, got %v", tc.err, err)
			}
		})
	}
}

func ptrInt(value int) *int {
	return &value
}
