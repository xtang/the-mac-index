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
func GetPriceHistory(db *sql.DB, countryCode, baseCurrency string) ([]HistoryRecord, error) {
	// Map base currency to column names
	indexColumnMap := map[string]string{
		"USD": "USD_raw",
		"EUR": "EUR_raw",
		"GBP": "GBP_raw",
		"JPY": "JPY_raw",
		"CNY": "CNY_raw",
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
		indexColumn = "USD_raw"
	}

	baseCountry, ok := baseCountryMap[baseCurrency]
	if !ok {
		baseCountry = "USA"
	}

	// Query with a subquery to get base country's exchange rate for the same date
	// base_price = country_dollar_price * base_country_exchange_rate
	query := fmt.Sprintf(`
		SELECT 
			strftime(c.date, '%%Y-%%m-%%d') AS date,
			c.local_price,
			c.dollar_price,
			COALESCE(c.dollar_price * b.dollar_ex, c.dollar_price) AS base_price,
			c.dollar_ex,
			COALESCE(c.%s, 0) AS raw_index
		FROM big_mac_raw c
		LEFT JOIN big_mac_raw b ON strftime(c.date, '%%Y-%%m') = strftime(b.date, '%%Y-%%m') AND b.iso_a3 = ?
		WHERE c.iso_a3 = ?
		ORDER BY c.date;
	`, indexColumn)

	rows, err := db.Query(query, baseCountry, countryCode)
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
