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
	DollarEx    float64 `json:"exchange_rate"`
	RawIndex    float64 `json:"raw_index"`
}

// GetPriceHistory returns price history for a country vs a base currency
func GetPriceHistory(db *sql.DB, countryCode, baseCurrency string) ([]HistoryRecord, error) {
	// Map base currency to column name
	columnMap := map[string]string{
		"USD": "USD_raw",
		"EUR": "EUR_raw",
		"GBP": "GBP_raw",
		"JPY": "JPY_raw",
		"CNY": "CNY_raw",
	}

	indexColumn, ok := columnMap[baseCurrency]
	if !ok {
		indexColumn = "USD_raw" // Default to USD
	}

	query := fmt.Sprintf(`
		SELECT 
			strftime(date, '%%Y-%%m-%%d') AS date,
			local_price,
			dollar_price,
			dollar_ex,
			COALESCE(%s, 0) AS raw_index
		FROM big_mac_raw
		WHERE iso_a3 = ?
		ORDER BY date;
	`, indexColumn)

	rows, err := db.Query(query, countryCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []HistoryRecord
	for rows.Next() {
		var r HistoryRecord
		if err := rows.Scan(&r.Date, &r.LocalPrice, &r.DollarPrice, &r.DollarEx, &r.RawIndex); err != nil {
			return nil, err
		}
		records = append(records, r)
	}

	return records, rows.Err()
}
