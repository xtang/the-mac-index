package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	_ "github.com/marcboeker/go-duckdb"
)

const (
	csvURL = "https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv"
	dbPath = "../data/ppt.db"
)

func main() {
	log.Println("🍔 Starting Big Mac Index data seeding...")

	// Ensure data directory exists
	dataDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Download CSV
	log.Println("📥 Downloading Big Mac CSV from The Economist...")
	csvData, err := downloadCSV(csvURL)
	if err != nil {
		log.Fatalf("Failed to download CSV: %v", err)
	}

	// Save CSV temporarily
	tmpFile := filepath.Join(dataDir, "big-mac-full-index.csv")
	if err := os.WriteFile(tmpFile, csvData, 0644); err != nil {
		log.Fatalf("Failed to write CSV file: %v", err)
	}
	defer os.Remove(tmpFile)
	log.Printf("✅ CSV downloaded (%d bytes)\n", len(csvData))

	// Connect to DuckDB
	log.Println("🦆 Connecting to DuckDB...")
	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to DuckDB: %v", err)
	}
	defer db.Close()

	// Create table
	log.Println("📋 Creating big_mac_raw table...")
	createTableSQL := `
		DROP TABLE IF EXISTS big_mac_raw;
		CREATE TABLE big_mac_raw (
			date DATE,
			iso_a3 VARCHAR,
			currency_code VARCHAR,
			name VARCHAR,
			local_price DOUBLE,
			dollar_ex DOUBLE,
			dollar_price DOUBLE,
			USD_raw DOUBLE,
			EUR_raw DOUBLE,
			GBP_raw DOUBLE,
			JPY_raw DOUBLE,
			CNY_raw DOUBLE
		);
	`
	if _, err := db.Exec(createTableSQL); err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	// Import CSV using DuckDB's native CSV reader
	log.Println("📊 Importing CSV data...")
	absPath, _ := filepath.Abs(tmpFile)
	importSQL := fmt.Sprintf(`
		INSERT INTO big_mac_raw 
		SELECT 
			date,
			iso_a3,
			currency_code,
			name,
			local_price,
			dollar_ex,
			dollar_price,
			USD_raw,
			EUR_raw,
			GBP_raw,
			JPY_raw,
			CNY_raw
		FROM read_csv('%s', header=true, auto_detect=true);
	`, absPath)

	if _, err := db.Exec(importSQL); err != nil {
		log.Fatalf("Failed to import CSV: %v", err)
	}

	// Verify import
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM big_mac_raw").Scan(&count); err != nil {
		log.Fatalf("Failed to count rows: %v", err)
	}

	var countryCount int
	if err := db.QueryRow("SELECT COUNT(DISTINCT iso_a3) FROM big_mac_raw").Scan(&countryCount); err != nil {
		log.Fatalf("Failed to count countries: %v", err)
	}

	log.Printf("✅ Successfully imported %d records for %d countries\n", count, countryCount)
	log.Printf("🎉 Database seeded at: %s\n", dbPath)
}

func downloadCSV(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}
