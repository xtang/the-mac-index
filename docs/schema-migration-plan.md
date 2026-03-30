# Database Schema Migration Plan: Multi-Index Support

## Current Schema

### Existing Table: `big_mac_raw`

```sql
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
```

**Issues with Current Design**:
- Table name is commodity-specific (`big_mac_raw`)
- Schema assumes local + dollar pricing (doesn't fit all commodities)
- Pre-computed index columns (USD_raw, EUR_raw, etc.) assume Big Mac methodology

---

## Proposed Schema: Option A - Unified Table (RECOMMENDED)

### New Table: `commodity_prices`

```sql
CREATE TABLE commodity_prices (
    -- Index identifier
    index_type VARCHAR NOT NULL,           -- 'bigmac', 'oil_brent', 'oil_wti', 'pork', 'eggs'
    
    -- Geographic and temporal
    date DATE NOT NULL,
    country_code VARCHAR,                  -- ISO 3166-1 alpha-3 (NULL for global commodities)
    country_name VARCHAR,
    
    -- Pricing data
    price DOUBLE NOT NULL,                 -- Primary price value
    price_currency VARCHAR NOT NULL,       -- Currency of price (USD, CNY, EUR, etc.)
    price_unit VARCHAR NOT NULL,           -- Unit of measurement ('item', 'barrel', 'kg', 'dozen')
    
    -- Original data columns (for Big Mac backward compatibility)
    local_price DOUBLE,                    -- Local currency price (for local-currency commodities)
    dollar_price DOUBLE,                   -- USD equivalent price
    exchange_rate DOUBLE,                  -- Exchange rate used for conversion
    
    -- Pre-computed indices (optional, can be computed on-the-fly)
    usd_index DOUBLE,                      -- PPP index vs USD baseline
    eur_index DOUBLE,
    gbp_index DOUBLE,
    jpy_index DOUBLE,
    cny_index DOUBLE,
    
    -- Metadata
    data_source VARCHAR,                   -- 'economist', 'fred', 'fao', 'worldbank'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    PRIMARY KEY (index_type, date, country_code)
);

-- Indexes for query performance
CREATE INDEX idx_commodity_prices_type_country ON commodity_prices(index_type, country_code);
CREATE INDEX idx_commodity_prices_type_date ON commodity_prices(index_type, date DESC);
CREATE INDEX idx_commodity_prices_country_date ON commodity_prices(country_code, date DESC);
```

### Design Rationale:

1. **Unified storage**: All commodity types in one table
   - Easier to add new commodities
   - Simpler query patterns for multi-commodity comparisons
   - Single migration path

2. **Flexible pricing model**: 
   - `price` + `price_currency` + `price_unit` can represent any commodity
   - Oil: price=78.50, price_currency='USD', price_unit='barrel'
   - Big Mac: price=5.15, price_currency='USD', price_unit='item'
   - Pork: price=3.25, price_currency='USD', price_unit='kg'

3. **Country code nullable**: 
   - Global commodities (oil) can have country_code=NULL or 'GLOBAL'
   - Country-specific commodities (Big Mac, local pork) have specific codes

4. **Backward compatible**: 
   - Retains `local_price` and `dollar_price` columns for Big Mac
   - Can populate both old and new columns during migration

---

## Migration Strategy

### Step 1: Create New Table

```sql
-- Create new table alongside existing one
CREATE TABLE commodity_prices (
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

CREATE INDEX idx_commodity_prices_type_country ON commodity_prices(index_type, country_code);
CREATE INDEX idx_commodity_prices_type_date ON commodity_prices(index_type, date DESC);
CREATE INDEX idx_commodity_prices_country_date ON commodity_prices(country_code, date DESC);
```

### Step 2: Migrate Existing Big Mac Data

```sql
-- Copy existing Big Mac data to new table
INSERT INTO commodity_prices (
    index_type,
    date,
    country_code,
    country_name,
    price,
    price_currency,
    price_unit,
    local_price,
    dollar_price,
    exchange_rate,
    usd_index,
    eur_index,
    gbp_index,
    jpy_index,
    cny_index,
    data_source
)
SELECT
    'bigmac' AS index_type,
    date,
    iso_a3 AS country_code,
    name AS country_name,
    dollar_price AS price,              -- Use USD price as primary price
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
```

### Step 3: Verify Migration

```sql
-- Verify row counts match
SELECT COUNT(*) FROM big_mac_raw;           -- Should match
SELECT COUNT(*) FROM commodity_prices WHERE index_type = 'bigmac';

-- Verify data integrity
SELECT 
    index_type,
    COUNT(*) as records,
    COUNT(DISTINCT country_code) as countries,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM commodity_prices
GROUP BY index_type;
```

### Step 4: Update Application Code

**Backend changes required**:
1. Update `db/duckdb.go` queries to use `commodity_prices` table
2. Add `index_type` filter to all queries
3. Default to `index_type = 'bigmac'` for backward compatibility
4. Update `GetCountries()` to accept index_type parameter

### Step 5: Keep Legacy Table (Optional)

```sql
-- Option A: Rename for safety (recommended for first deploy)
ALTER TABLE big_mac_raw RENAME TO big_mac_raw_backup;

-- Option B: Drop after validation period (e.g., 30 days)
-- DROP TABLE big_mac_raw_backup;
```

---

## Alternative: Option B - Separate Tables Per Commodity

### Schema:

```sql
CREATE TABLE big_mac_index (...);   -- Existing, keep as-is
CREATE TABLE oil_prices (...);      -- New
CREATE TABLE pork_prices (...);     -- New
CREATE TABLE egg_prices (...);      -- New
```

### Pros:
- No migration of existing data
- Commodity-specific schemas
- Easier to optimize per commodity

### Cons:
- Harder to add new commodities (new table each time)
- Duplicated code for similar operations
- Complex cross-commodity queries
- More complex API layer (routing to different tables)

**Verdict**: Not recommended. Violates DRY principle and makes feature additions harder.

---

## Migration Script: Go Implementation

### File: `backend/scripts/migrate_to_multi_index.go`

```go
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
	log.Println("Creating commodity_prices table...")
	if err := createCommodityPricesTable(db); err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}
	
	// Step 2: Migrate data
	log.Println("Migrating Big Mac data...")
	if err := migrateBigMacData(db); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}
	
	// Step 3: Verify
	log.Println("Verifying migration...")
	if err := verifyMigration(db); err != nil {
		log.Fatalf("Verification failed: %v", err)
	}
	
	log.Println("✅ Migration completed successfully!")
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
		
		CREATE INDEX IF NOT EXISTS idx_commodity_prices_type_country 
			ON commodity_prices(index_type, country_code);
		CREATE INDEX IF NOT EXISTS idx_commodity_prices_type_date 
			ON commodity_prices(index_type, date DESC);
		CREATE INDEX IF NOT EXISTS idx_commodity_prices_country_date 
			ON commodity_prices(country_code, date DESC);
	`
	_, err := db.Exec(createSql)
	return err
}

func migrateBigMacData(db *sql.DB) error {
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
		FROM big_mac_raw
		WHERE NOT EXISTS (
			SELECT 1 FROM commodity_prices 
			WHERE index_type = 'bigmac' 
			  AND date = big_mac_raw.date 
			  AND country_code = big_mac_raw.iso_a3
		);
	`
	result, err := db.Exec(migrateSql)
	if err != nil {
		return err
	}
	
	rows, _ := result.RowsAffected()
	log.Printf("Migrated %d records", rows)
	return nil
}

func verifyMigration(db *sql.DB) error {
	var oldCount, newCount int
	
	if err := db.QueryRow("SELECT COUNT(*) FROM big_mac_raw").Scan(&oldCount); err != nil {
		return err
	}
	
	if err := db.QueryRow("SELECT COUNT(*) FROM commodity_prices WHERE index_type = 'bigmac'").Scan(&newCount); err != nil {
		return err
	}
	
	log.Printf("Old table: %d records", oldCount)
	log.Printf("New table: %d records", newCount)
	
	if oldCount != newCount {
		log.Printf("⚠️  Warning: Record counts don't match!")
	}
	
	return nil
}
```

---

## Rollback Plan

### If migration fails:

```sql
-- Drop new table
DROP TABLE IF EXISTS commodity_prices;

-- Original big_mac_raw table remains untouched
-- No data loss
```

### If issues found post-migration:

```sql
-- Restore from backup
ALTER TABLE big_mac_raw_backup RENAME TO big_mac_raw;
DROP TABLE commodity_prices;

-- Revert code deployment
```

---

## Testing Checklist

- [ ] Migration script runs without errors
- [ ] Record counts match between old and new tables
- [ ] Sample queries return identical results
- [ ] All countries present in new table
- [ ] Date ranges preserved
- [ ] Price values match (spot-check 10+ random records)
- [ ] Indexes created successfully
- [ ] Query performance acceptable (< 100ms for typical queries)
- [ ] Existing API endpoints work with new schema
- [ ] Frontend continues to display Big Mac data correctly

---

## Timeline

- **Day 1**: Implement migration script
- **Day 2**: Test migration on development database
- **Day 3**: Update backend code to use new schema
- **Day 4**: Integration testing
- **Day 5**: Deploy to staging, monitor for 24h
- **Day 6**: Production deployment with rollback plan ready

---

**Document Version**: 1.0  
**Last Updated**: 2024-03-30  
**Status**: Ready for Implementation
