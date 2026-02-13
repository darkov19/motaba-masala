package report

// ValuationResponse represents the total stock valuation.
type ValuationResponse struct {
	TotalValue float64 `json:"total_value"`
	Currency   string  `json:"currency"`
}

// Service defines the reporting capabilities.
type Service interface {
	GetValuation(token string) (*ValuationResponse, error)
}
