package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/marcboeker/go-duckdb"
)

const (
	dbPath       = "../data/ppt.db"
	fredAPIBase  = "https://api.stlouisfed.org/fred/series/observations"
	brentSeriesID = "DCOILBRENTEU" // Brent Crude Oil Price
	wtiSeriesID   = "DCOILWTICO"    // WTI Crude Oil Price
)

type FREDResponse struct {
	Observations []FREDObservation `json:"observations"`
}

type FREDObservation struct {
	Date  string `json:"date"`
	Value string `json:"value"`
}

func main() {
	log.Println("⛽ Starting Crude Oil price data import...")

	// Get FRED API key from environment
	apiKey := os.Getenv("FRED_API_KEY")
	if apiKey == "" {
		log.Println("⚠️  FRED_API_KEY not set, using demo data")
		// For demo purposes, we'll create synthetic data
		if err := importDemoOilData(); err != nil {
			log.Fatalf("Failed to import demo data: %v", err)
		}
		return
	}

	// Connect to DuckDB
	log.Println("🦆 Connecting to DuckDB...")
	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to DuckDB: %v", err)
	}
	defer db.Close()

	// Import Brent Crude prices
	log.Println("📥 Fetching Brent Crude prices from FRED...")
	if err := importOilPrices(db, apiKey, brentSeriesID, "oil_brent"); err != nil {
		log.Fatalf("Failed to import Brent: %v", err)
	}

	// Import WTI prices
	log.Println("📥 Fetching WTI Crude prices from FRED...")
	if err := importOilPrices(db, apiKey, wtiSeriesID, "oil_wti"); err != nil {
		log.Fatalf("Failed to import WTI: %v", err)
	}

	log.Println("🎉 Oil price import completed successfully!")
}

func importOilPrices(db *sql.DB, apiKey, seriesID, indexType string) error {
	// Build FRED API URL
	// Get data from 2000 onwards to match Big Mac timeline
	startDate := "2000-01-01"
	url := fmt.Sprintf("%s?series_id=%s&api_key=%s&file_type=json&observation_start=%s&limit=10000",
		fredAPIBase, seriesID, apiKey, startDate)

	// Fetch data
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("FRED API error (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	var fredResp FREDResponse
	if err := json.Unmarshal(body, &fredResp); err != nil {
		return fmt.Errorf("failed to parse JSON: %w", err)
	}

	log.Printf("✅ Fetched %d observations", len(fredResp.Observations))

	// Prepare insert statement
	insertSQL := `
		INSERT INTO commodity_prices (
			index_type, date, country_code, country_name,
			price, price_currency, price_unit,
			dollar_price, data_source
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
	`

	stmt, err := db.Prepare(insertSQL)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	// Insert observations
	insertedCount := 0
	skippedCount := 0

	for _, obs := range fredResp.Observations {
		// Skip invalid values (FRED uses "." for missing data)
		if obs.Value == "." || obs.Value == "" {
			skippedCount++
			continue
		}

		// Parse date
		date, err := time.Parse("2006-01-02", obs.Date)
		if err != nil {
			log.Printf("⚠️  Skipping invalid date: %s", obs.Date)
			skippedCount++
			continue
		}

		// Parse price
		var price float64
		if _, err := fmt.Sscanf(obs.Value, "%f", &price); err != nil {
			log.Printf("⚠️  Skipping invalid price: %s", obs.Value)
			skippedCount++
			continue
		}

		// Oil is a global commodity, so we use "GLOBAL" as country_code
		_, err = stmt.Exec(
			indexType,           // index_type
			date,                // date
			"GLOBAL",            // country_code
			"Global",            // country_name
			price,               // price
			"USD",               // price_currency
			"barrel",            // price_unit
			price,               // dollar_price (same as price for USD)
			"fred",              // data_source
		)

		if err != nil {
			// Silently skip duplicates
			skippedCount++
			continue
		}

		insertedCount++
	}

	log.Printf("✅ Inserted %d %s records (skipped %d)", insertedCount, indexType, skippedCount)
	return nil
}

// importDemoOilData creates synthetic oil price data for demonstration
func importDemoOilData() error {
	log.Println("🦆 Connecting to DuckDB...")
	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	defer db.Close()

	log.Println("📊 Creating demo oil price data (2000-2025)...")

	// Generate synthetic data
	// Brent crude historical range: ~$20-140/barrel
	// We'll create quarterly data points with realistic variation
	
	// First, check if data already exists
	var existingCount int
	db.QueryRow("SELECT COUNT(*) FROM commodity_prices WHERE index_type IN ('oil_brent', 'oil_wti')").Scan(&existingCount)
	if existingCount > 0 {
		log.Printf("ℹ️  Found %d existing oil price records, skipping import", existingCount)
		return nil
	}
	
	insertSQL := `
		INSERT INTO commodity_prices (
			index_type, date, country_code, country_name,
			price, price_currency, price_unit,
			dollar_price, data_source
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
	`

	stmt, err := db.Prepare(insertSQL)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	// Synthetic price data (quarterly averages based on historical trends)
	type PricePoint struct {
		Year  int
		Month int
		Price float64
	}

	// Simplified historical trend data
	pricePoints := []PricePoint{
		{2000, 1, 28.50}, {2000, 7, 30.20},
		{2001, 1, 27.80}, {2001, 7, 26.50},
		{2002, 1, 21.00}, {2002, 7, 26.30},
		{2003, 1, 31.50}, {2003, 7, 28.90},
		{2004, 1, 32.50}, {2004, 7, 38.20},
		{2005, 1, 47.00}, {2005, 7, 57.50},
		{2006, 1, 65.00}, {2006, 7, 74.00},
		{2007, 1, 56.00}, {2007, 7, 77.50},
		{2008, 1, 96.00}, {2008, 7, 140.00}, {2008, 10, 70.00},
		{2009, 1, 44.00}, {2009, 7, 68.00},
		{2010, 1, 76.50}, {2010, 7, 78.00},
		{2011, 1, 96.50}, {2011, 7, 117.00},
		{2012, 1, 111.00}, {2012, 7, 103.00},
		{2013, 1, 112.00}, {2013, 7, 108.00},
		{2014, 1, 107.50}, {2014, 7, 112.00}, {2014, 10, 87.00},
		{2015, 1, 52.00}, {2015, 7, 57.00},
		{2016, 1, 34.00}, {2016, 7, 48.50},
		{2017, 1, 55.00}, {2017, 7, 51.00},
		{2018, 1, 68.00}, {2018, 7, 77.50}, {2018, 10, 80.00},
		{2019, 1, 61.00}, {2019, 7, 64.00},
		{2020, 1, 64.00}, {2020, 4, 23.00}, {2020, 7, 43.00}, {2020, 10, 42.00},
		{2021, 1, 55.00}, {2021, 7, 73.00}, {2021, 10, 83.00},
		{2022, 1, 85.00}, {2022, 3, 112.00}, {2022, 7, 105.00}, {2022, 10, 95.00},
		{2023, 1, 83.00}, {2023, 7, 78.00}, {2023, 10, 85.00},
		{2024, 1, 82.00}, {2024, 7, 85.00}, {2024, 10, 80.00},
		{2025, 1, 78.00},
	}

	insertCount := 0
	for _, pp := range pricePoints {
		date := time.Date(pp.Year, time.Month(pp.Month), 1, 0, 0, 0, 0, time.UTC)

		// Insert Brent
		_, err = stmt.Exec("oil_brent", date, "GLOBAL", "Global", pp.Price, "USD", "barrel", pp.Price, "demo")
		if err == nil {
			insertCount++
		}

		// WTI is typically $2-5 cheaper than Brent
		wtiPrice := pp.Price - 3.0
		if wtiPrice < 0 {
			wtiPrice = pp.Price * 0.95
		}
		_, err = stmt.Exec("oil_wti", date, "GLOBAL", "Global", wtiPrice, "USD", "barrel", wtiPrice, "demo")
		if err == nil {
			insertCount++
		}
	}

	log.Printf("✅ Created %d demo oil price records", insertCount)
	log.Println("🎉 Demo oil data import completed!")
	return nil
}
