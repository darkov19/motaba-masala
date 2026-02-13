package report

import (
	authApp "masala_inventory_managment/internal/app/auth"
	domainAuth "masala_inventory_managment/internal/domain/auth"
	domainReport "masala_inventory_managment/internal/domain/report"
)

// AppService implements the report service with security checks.
type AppService struct {
	authService *authApp.Service
}

// NewAppService creates a new report application service.
func NewAppService(auth *authApp.Service) *AppService {
	return &AppService{
		authService: auth,
	}
}

// GetValuation returns the stock valuation. Restricted to Admin.
func (s *AppService) GetValuation(token string) (*domainReport.ValuationResponse, error) {
	// AC #5 & AC #4: Perform token validation and role check
	err := s.authService.CheckPermission(token, domainAuth.RoleAdmin)
	if err != nil {
		return nil, err
	}

	// Implementation stub for now
	return &domainReport.ValuationResponse{
		TotalValue: 125000.50,
		Currency:   "INR",
	}, nil
}
