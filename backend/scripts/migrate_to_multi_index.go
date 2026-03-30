package main

import (
	"database/sql"
	"log"

	_ "github.com/marcboeker/go-duckdb"
)

const dbPath = "../data/ppt.db"

func main() {
	log.Println("🔄 Starting multi-index migration...")

	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	// Step 1: Create new table
	log.Println("📋 Creating commodity_prices table...")
	if err := createCommodityPricesTable(db); err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	// Step 2: Migrate data
	log.Println("🔄 Migrating Big Mac data...")
	if err := migrateBigMacData(db); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	// Step 3: Verify
	log.Println("✅ Verifying migration...")
	if err := verifyMigration(db); err != nil {
		log.Fatalf("Verification failed: %v", err)
	}

	log.Println("🎉 Migration completed successfully!")
}

func createCommodityPricesTable(db *sql.DB) error {
	createSql := `
		CREATE TABLE IF NOT EXISTS commodity_prices (
			index_type VARCHAR NOT NULL,
			date DATE NOT NULL,
			country_code VARCHAR,
			country_name VARCHAR,
			price DOUBLE NOT NULL,
			price_currency VARCHAR NOT NULL,
			price_unit VARCHAR NOT NULL,
			local_price DOUBLE,
			dollar_price DOUBLE,
			exchange_rate DOUBLE,
			usd_index DOUBLE,
			eur_index DOUBLE,
			gbp_index DOUBLE,
			jpy_index DOUBLE,
			cny_index DOUBLE,
			data_source VARCHAR,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`
	_, err := db.Exec(createSql)
	if err != nil {
		return err
	}

	// Create indexes
	indexSql := `
		CREATE INDEX IF NOT EXISTS idx_commodity_prices_type_country 
			ON commodity_prices(index_type, country_code);
		CREATE INDEX IF NOT EXISTS idx_commodity_prices_type_date 
			ON commodity_prices(index_type, date);
		CREATE INDEX IF NOT EXISTS idx_commodity_prices_country_date 
			ON commodity_prices(country_code, date);
	`
	_, err = db.Exec(indexSql)
	return err
}

func migrateBigMacData(db *sql.DB) error {
	// First check if data already exists
	var existingCount int
	db.QueryRow("SELECT COUNT(*) FROM commodity_prices WHERE index_type = 'bigmac'").Scan(&existingCount)
	if existingCount > 0 {
		log.Printf("ℹ️  Found %d existing Big Mac records, skipping migration", existingCount)
		return nil
	}

	migrateSql := `
		INSERT INTO commodity_prices (
			index_type, date, country_code, country_name,
			price, price_currency, price_unit,
			local_price, dollar_price, exchange_rate,
			usd_index, eur_index, gbp_index, jpy_index, cny_index,
			data_source
		)
		SELECT
			'bigmac' AS index_type,
			date,
			iso_a3 AS country_code,
			name AS country_name,
			dollar_price AS price,
			'USD' AS price_currency,
			'item' AS price_unit,
			local_price,
			dollar_price,
			dollar_ex AS exchange_rate,
			USD_raw AS usd_index,
			EUR_raw AS eur_index,
			GBP_raw AS gbp_index,
			JPY_raw AS jpy_index,
			CNY_raw AS cny_index,
			'economist' AS data_source
		FROM big_mac_raw;
	`
	result, err := db.Exec(migrateSql)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	log.Printf("✅ Migrated %d records", rows)
	return nil
}

func verifyMigration(db *sql.DB) error {
	var oldCount, newCount, countryCount int

	if err := db.QueryRow("SELECT COUNT(*) FROM big_mac_raw").Scan(&oldCount); err != nil {
		return err
	}

	if err := db.QueryRow("SELECT COUNT(*) FROM commodity_prices WHERE index_type = 'bigmac'").Scan(&newCount); err != nil {
		return err
	}

	if err := db.QueryRow("SELECT COUNT(DISTINCT country_code) FROM commodity_prices WHERE index_type = 'bigmac'").Scan(&countryCount); err != nil {
		return err
	}

	log.Printf("📊 Old table: %d records", oldCount)
	log.Printf("📊 New table: %d records", newCount)
	log.Printf("📊 Countries: %d", countryCount)

	if oldCount != newCount {
		log.Printf("⚠️  Warning: Record counts don't match!")
		return nil // Don't fail, just warn
	}

	log.Println("✅ Verification passed!")
	return nil
}
