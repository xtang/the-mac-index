package db

import (
	"database/sql"
	"fmt"
)

// PPPRequest represents the calculator input
type PPPRequest struct {
	Amount     float64 `json:"amount"`
	Currency   string  `json:"currency"`
	Year       int     `json:"year"`
	TargetYear int     `json:"target_year"`
}

// PPPResult represents the calculator output
type PPPResult struct {
	OriginalAmount   float64 `json:"original_amount"`
	OriginalCurrency string  `json:"original_currency"`
	SourceYear       int     `json:"source_year"`
	TargetYear       int     `json:"target_year"`
	SourcePrice      float64 `json:"source_price"`
	TargetPrice      float64 `json:"target_price"`
	EquivalentAmount float64 `json:"equivalent_amount"`
	PurchasingPower  float64 `json:"purchasing_power_change"` // percentage
}

// CalculatePPP calculates purchasing power parity across years
func CalculatePPP(db *sql.DB, req PPPRequest) (*PPPResult, error) {
	// Find the country code from currency
	var countryCode string
	err := db.QueryRow(`
		SELECT DISTINCT iso_a3 
		FROM big_mac_raw 
		WHERE currency_code = ? 
		LIMIT 1
	`, req.Currency).Scan(&countryCode)
	if err != nil {
		return nil, fmt.Errorf("currency not found: %s", req.Currency)
	}

	// Get price for source year (closest date)
	var sourcePrice float64
	err = db.QueryRow(`
		SELECT local_price 
		FROM big_mac_raw 
		WHERE iso_a3 = ? AND EXTRACT(YEAR FROM date) = ?
		ORDER BY date DESC
		LIMIT 1
	`, countryCode, req.Year).Scan(&sourcePrice)
	if err != nil {
		return nil, fmt.Errorf("no data for year %d", req.Year)
	}

	// Get price for target year (closest date)
	var targetPrice float64
	err = db.QueryRow(`
		SELECT local_price 
		FROM big_mac_raw 
		WHERE iso_a3 = ? AND EXTRACT(YEAR FROM date) = ?
		ORDER BY date DESC
		LIMIT 1
	`, countryCode, req.TargetYear).Scan(&targetPrice)
	if err != nil {
		return nil, fmt.Errorf("no data for year %d", req.TargetYear)
	}

	// Calculate: (Amount / Price_source) * Price_target
	equivalentAmount := (req.Amount / sourcePrice) * targetPrice
	purchasingPowerChange := ((sourcePrice / targetPrice) - 1) * 100

	return &PPPResult{
		OriginalAmount:   req.Amount,
		OriginalCurrency: req.Currency,
		SourceYear:       req.Year,
		TargetYear:       req.TargetYear,
		SourcePrice:      sourcePrice,
		TargetPrice:      targetPrice,
		EquivalentAmount: equivalentAmount,
		PurchasingPower:  purchasingPowerChange,
	}, nil
}
