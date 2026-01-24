package db

import (
	"database/sql"
	"sync"

	_ "github.com/marcboeker/go-duckdb"
)

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

// Country represents a country in the Big Mac dataset
type Country struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	Currency string `json:"currency"`
}

// GetCountries returns all unique countries from the dataset
func GetCountries(db *sql.DB) ([]Country, error) {
	query := `
		SELECT 
			iso_a3 AS code,
			FIRST(name) AS name,
			FIRST(currency_code) AS currency
		FROM big_mac_raw
		GROUP BY iso_a3
		ORDER BY name;
	`

	rows, err := db.Query(query)
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
