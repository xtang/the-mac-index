package db

import (
	"database/sql"
	"sync"

	_ "github.com/marcboeker/go-duckdb"
)

// ValidIndexTypes defines the allowed index types
var ValidIndexTypes = map[string]bool{
	"bigmac":    true,
	"oil_brent": true,
	"oil_wti":   true,
	"pork":      true,
	"eggs":      true,
}

// IsValidIndexType checks if the given index type is supported
func IsValidIndexType(indexType string) bool {
	if indexType == "" {
		return true // empty means default (bigmac)
	}
	return ValidIndexTypes[indexType]
}

var (
	instance *sql.DB
	once     sync.Once
)

// GetDB returns a singleton DuckDB connection
func GetDB(dbPath string) (*sql.DB, error) {
	var err error
	once.Do(func() {
		instance, err = sql.Open("duckdb", dbPath)
	})
	return instance, err
}

// Country represents a country in the dataset
type Country struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	Currency string `json:"currency"`
}

// IndexInfo represents metadata about a commodity index
type IndexInfo struct {
	Type            string `json:"type"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	Unit            string `json:"unit"`
	DataSource      string `json:"data_source"`
	Countries       int    `json:"countries"`
	Records         int    `json:"records"`
	DateRangeStart  string `json:"date_range_start"`
	DateRangeEnd    string `json:"date_range_end"`
	UpdateFrequency string `json:"update_frequency"`
}

// GetCountries returns all unique countries from the dataset for a given index type
func GetCountries(db *sql.DB, indexType string) ([]Country, error) {
	if indexType == "" {
		indexType = "bigmac" // default to Big Mac for backward compatibility
	}

	// For global commodities like oil, return a special "GLOBAL" entry
	if indexType == "oil_brent" || indexType == "oil_wti" {
		return []Country{
			{Code: "GLOBAL", Name: "Global Benchmark", Currency: "USD"},
		}, nil
	}

	// For country-specific indices, query from commodity_prices
	query := `
		SELECT 
			country_code AS code,
			FIRST(country_name) AS name,
			FIRST(price_currency) AS currency
		FROM commodity_prices
		WHERE index_type = ?
		  AND country_code IS NOT NULL
		  AND country_code != 'GLOBAL'
		GROUP BY country_code
		ORDER BY name;
	`

	rows, err := db.Query(query, indexType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var countries []Country
	for rows.Next() {
		var c Country
		if err := rows.Scan(&c.Code, &c.Name, &c.Currency); err != nil {
			return nil, err
		}
		countries = append(countries, c)
	}

	return countries, rows.Err()
}

// GetAvailableIndices returns metadata about all available commodity indices
func GetAvailableIndices(db *sql.DB) ([]IndexInfo, error) {
	query := `
		SELECT 
			index_type,
			FIRST(price_unit) AS unit,
			FIRST(data_source) AS data_source,
			COUNT(*) AS records,
			COUNT(DISTINCT country_code) AS countries,
			MIN(date) AS date_start,
			MAX(date) AS date_end
		FROM commodity_prices
		GROUP BY index_type
		ORDER BY index_type;
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Define metadata for each index type
	indexMetadata := map[string]struct {
		name        string
		description string
		frequency   string
	}{
		"bigmac": {
			name:        "Big Mac Index",
			description: "Purchasing power parity based on McDonald's Big Mac prices",
			frequency:   "Semi-annual",
		},
		"oil_brent": {
			name:        "Brent Crude Oil",
			description: "Global oil benchmark price (Europe Brent Spot FOB)",
			frequency:   "Daily",
		},
		"oil_wti": {
			name:        "WTI Crude Oil",
			description: "West Texas Intermediate crude oil price",
			frequency:   "Daily",
		},
		"pork": {
			name:        "Pork Price Index",
			description: "International pork prices by country",
			frequency:   "Monthly",
		},
		"eggs": {
			name:        "Egg Price Index",
			description: "International egg prices by country",
			frequency:   "Monthly",
		},
	}

	var indices []IndexInfo
	for rows.Next() {
		var info IndexInfo
		var indexType string

		if err := rows.Scan(
			&indexType,
			&info.Unit,
			&info.DataSource,
			&info.Records,
			&info.Countries,
			&info.DateRangeStart,
			&info.DateRangeEnd,
		); err != nil {
			return nil, err
		}

		info.Type = indexType

		// Add metadata if available
		if meta, ok := indexMetadata[indexType]; ok {
			info.Name = meta.name
			info.Description = meta.description
			info.UpdateFrequency = meta.frequency
		} else {
			info.Name = indexType
			info.Description = "Commodity price index"
			info.UpdateFrequency = "Variable"
		}

		indices = append(indices, info)
	}

	return indices, rows.Err()
}
