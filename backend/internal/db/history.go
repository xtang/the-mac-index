package db

import (
	"database/sql"
	"fmt"
)

// HistoryRecord represents a single data point in the price history
type HistoryRecord struct {
	Date        string  `json:"date"`
	LocalPrice  float64 `json:"local_price"`
	DollarPrice float64 `json:"dollar_price"`
	BasePrice   float64 `json:"base_price"`
	DollarEx    float64 `json:"exchange_rate"`
	RawIndex    float64 `json:"raw_index"`
}

// GetPriceHistory returns price history for a country vs a base currency
// Now supports multiple index types
func GetPriceHistory(db *sql.DB, indexType, countryCode, baseCurrency string) ([]HistoryRecord, error) {
	if indexType == "" {
		indexType = "bigmac" // default for backward compatibility
	}

	// For global commodities (oil), country is always GLOBAL
	if indexType == "oil_brent" || indexType == "oil_wti" {
		countryCode = "GLOBAL"
	}

	// Map base currency to column names (for indices that have them)
	indexColumnMap := map[string]string{
		"USD": "usd_index",
		"EUR": "eur_index",
		"GBP": "gbp_index",
		"JPY": "jpy_index",
		"CNY": "cny_index",
	}

	// Map base currency to country code for price lookup
	baseCountryMap := map[string]string{
		"USD": "USA",
		"EUR": "EUZ", // Euro area
		"GBP": "GBR",
		"JPY": "JPN",
		"CNY": "CHN",
	}

	indexColumn, ok := indexColumnMap[baseCurrency]
	if !ok {
		indexColumn = "usd_index"
	}

	baseCountry, ok := baseCountryMap[baseCurrency]
	if !ok {
		baseCountry = "USA"
	}

	// For global commodities, use simplified query
	if countryCode == "GLOBAL" {
		query := `
			SELECT 
				strftime(date, '%Y-%m-%d') AS date,
				CAST(price AS DOUBLE) AS local_price,
				CAST(dollar_price AS DOUBLE) AS dollar_price,
				CAST(dollar_price AS DOUBLE) AS base_price,
				CAST(1.0 AS DOUBLE) AS exchange_rate,
				CAST(0.0 AS DOUBLE) AS raw_index
			FROM commodity_prices
			WHERE index_type = ? AND country_code = 'GLOBAL'
			ORDER BY date;
		`
		rows, err := db.Query(query, indexType)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		var records []HistoryRecord
		for rows.Next() {
			var r HistoryRecord
			if err := rows.Scan(&r.Date, &r.LocalPrice, &r.DollarPrice, &r.BasePrice, &r.DollarEx, &r.RawIndex); err != nil {
				return nil, err
			}
			records = append(records, r)
		}
		return records, rows.Err()
	}

	// For country-specific commodities, use the full query with base currency conversion
	query := fmt.Sprintf(`
		SELECT 
			strftime(c.date, '%%Y-%%m-%%d') AS date,
			COALESCE(c.local_price, c.price) AS local_price,
			c.dollar_price,
			COALESCE(c.dollar_price * b.exchange_rate, c.dollar_price) AS base_price,
			COALESCE(c.exchange_rate, 1.0) AS exchange_rate,
			COALESCE(c.%s, 0) AS raw_index
		FROM commodity_prices c
		LEFT JOIN commodity_prices b 
			ON strftime(c.date, '%%Y-%%m') = strftime(b.date, '%%Y-%%m') 
			AND b.index_type = c.index_type
			AND b.country_code = ?
		WHERE c.index_type = ? AND c.country_code = ?
		ORDER BY c.date;
	`, indexColumn)

	rows, err := db.Query(query, baseCountry, indexType, countryCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []HistoryRecord
	for rows.Next() {
		var r HistoryRecord
		if err := rows.Scan(&r.Date, &r.LocalPrice, &r.DollarPrice, &r.BasePrice, &r.DollarEx, &r.RawIndex); err != nil {
			return nil, err
		}
		records = append(records, r)
	}

	return records, rows.Err()
}
