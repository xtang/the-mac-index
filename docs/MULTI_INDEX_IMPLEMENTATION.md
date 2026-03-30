# Multi-Index Implementation Documentation

## Summary

This implementation extends the Purchasing Power Terminal to support multiple commodity indices beyond the Big Mac Index. Phase 1 adds support for **Crude Oil prices** (Brent and WTI), demonstrating the architecture for future commodity additions.

## What Was Implemented

### ✅ Phase 1 Complete: Crude Oil Index Support

#### 1. Database Schema Migration
- **New Table**: `commodity_prices` - unified table for all commodity types
- **Schema Features**:
  - `index_type` column to distinguish commodities (bigmac, oil_brent, oil_wti, etc.)
  - Flexible pricing model with `price`, `price_currency`, and `price_unit`
  - Support for both global (oil) and country-specific (Big Mac) commodities
  - Backward compatible with existing Big Mac data

- **Migration**: Successfully migrated 1,894 Big Mac records from legacy `big_mac_raw` table
- **Script**: `backend/scripts/migrate_to_multi_index.go`

#### 2. Data Import Pipeline
- **Oil Price Import**: `backend/scripts/import_oil_prices.go`
  - Supports FRED API integration (requires `FRED_API_KEY` environment variable)
  - Includes demo data generator for development/testing (61 synthetic data points from 2000-2025)
  - Supports both Brent Crude and WTI pricing
  - Data stored with `country_code = 'GLOBAL'` since oil is a global benchmark

- **Current Data**:
  - Big Mac: 1,894 records across 56 countries (2000-2025)
  - Brent Crude: 61 records (demo data, 2000-2025)
  - WTI Crude: 61 records (demo data, 2000-2025)

#### 3. Backend API Updates

##### New Endpoint: `/api/v1/indices`
Returns metadata about all available commodity indices:
```json
{
  "count": 3,
  "indices": [
    {
      "type": "bigmac",
      "name": "Big Mac Index",
      "description": "Purchasing power parity based on McDonald's Big Mac prices",
      "unit": "item",
      "data_source": "economist",
      "countries": 56,
      "records": 1894,
      "date_range_start": "2000-04-01",
      "date_range_end": "2025-01-01",
      "update_frequency": "Semi-annual"
    },
    {
      "type": "oil_brent",
      "name": "Brent Crude Oil",
      "description": "Global oil benchmark price (Europe Brent Spot FOB)",
      "unit": "barrel",
      ...
    }
  ]
}
```

##### Updated Endpoints:

**`GET /api/v1/countries`**
- Now accepts `?type=bigmac|oil_brent|oil_wti` parameter
- Default: `bigmac` (backward compatible)
- For oil indices, returns `[{code: "GLOBAL", name: "Global Benchmark", currency: "USD"}]`

**`GET /api/v1/index/history`**
- Now accepts `?type=` parameter in addition to `country` and `base`
- Example: `/api/v1/index/history?type=oil_brent&country=GLOBAL&base=USD`
- Response includes `index_type` field
- Handles both global (oil) and country-specific (Big Mac) commodities

##### Modified Backend Files:
- `backend/internal/db/duckdb.go`
  - Added `GetCountries(db, indexType)` - now index-aware
  - Added `GetAvailableIndices(db)` - new discovery endpoint
  - Added `IsValidIndexType()` validation
  - Added `IndexInfo` struct for metadata

- `backend/internal/db/history.go`
  - Updated `GetPriceHistory(db, indexType, country, base)` - added index_type parameter
  - Separate query paths for global vs country-specific commodities
  - Fixed DuckDB decimal casting issues

- `backend/internal/handlers/countries.go`
  - Updated `CountriesHandler` to accept and validate `?type=` parameter
  - Added `IndicesHandler` for new `/indices` endpoint

- `backend/internal/handlers/history.go`
  - Updated to support `?type=` parameter
  - Added validation for index types

- `backend/cmd/server/main.go`
  - Registered new `/api/v1/indices` route
  - Updated route documentation

#### 4. Frontend Updates

##### New Component: `IndexSelector.tsx`
- Dropdown to select active commodity index
- Fetches available indices from `/api/v1/indices`
- Displays index metadata (description, unit, frequency)
- Terminal-themed styling consistent with app aesthetic

##### Updated Components:

**`App.tsx`**
- Added `selectedIndex` state (default: "bigmac")
- Updated API calls to include `?type=${selectedIndex}`
- Added index change handler that:
  - Clears selected country when switching indices
  - Refetches country list for new index
  - Updates chart data
- Integrated IndexSelector into UI layout
- Added localStorage persistence for selected index

**`PriceChart.tsx`**
- Added `indexType` prop for dynamic labeling
- Dynamic Y-axis labels based on commodity:
  - Big Mac: "Price (USD)"
  - Oil: "Price (USD/barrel)"
- Dynamic chart titles based on selected index

**`types/api.ts`**
- Added `IndexInfo` interface
- Added `IndicesResponse` interface
- Updated `HistoryResponse` to include `index_type`
- Added `CountriesResponse` interface

#### 5. Documentation

- ✅ `docs/data-sources-analysis.md` - Comprehensive data source research
- ✅ `docs/schema-migration-plan.md` - Database schema design and migration strategy
- ✅ `docs/MULTI_INDEX_IMPLEMENTATION.md` - This file

## Architecture Decisions

### Why Unified Table (`commodity_prices`)?
1. **Easier to add new commodities** - Just insert with new `index_type`, no schema changes
2. **Consistent query patterns** - Single codebase for all commodity queries
3. **Simpler migrations** - One-time migration, all future commodities use same structure
4. **Cross-commodity analysis** - Future feature: compare multiple indices on one chart

### Why Oil First?
1. **Lowest complexity** - Already priced in USD globally, no currency conversion
2. **Universal relevance** - Affects all economies
3. **High data quality** - FRED API is authoritative and reliable
4. **Validates architecture** - Tests multi-index design before adding more complex commodities

### Handling Global vs Country-Specific Commodities
- **Global commodities** (oil): `country_code = 'GLOBAL'`, single price applies worldwide
- **Country-specific** (Big Mac, future pork/eggs): `country_code = ISO code`, different prices per country
- API transparently handles both types with conditional query logic

## Testing Performed

### Database Migration
- ✅ Migration script executes without errors
- ✅ All 1,894 Big Mac records migrated successfully
- ✅ Record counts match between old and new tables
- ✅ 56 countries preserved
- ✅ Date ranges intact (2000-2025)

### Data Import
- ✅ Oil price import script runs successfully
- ✅ Demo data generator creates 122 records (61 Brent + 61 WTI)
- ✅ Idempotent import (can run multiple times safely)
- ✅ Data validation passes

### Backend API
- ✅ `/api/v1/indices` returns all 3 indices with correct metadata
- ✅ `/api/v1/countries?type=bigmac` returns 56 countries
- ✅ `/api/v1/countries?type=oil_brent` returns GLOBAL
- ✅ `/api/v1/index/history?type=oil_brent&country=GLOBAL` returns 61 records
- ✅ `/api/v1/index/history?type=bigmac&country=USA` returns 42 records
- ✅ Backward compatibility: endpoints work without `?type=` parameter (defaults to bigmac)

### Frontend
- ✅ IndexSelector component renders and fetches indices
- ✅ Switching indices updates country list
- ✅ Chart labels update dynamically based on selected index
- ✅ localStorage persists user's index preference

## Usage Examples

### API Usage

#### Get all available indices:
```bash
curl http://localhost:3000/api/v1/indices
```

#### Get countries for Big Mac:
```bash
curl "http://localhost:3000/api/v1/countries?type=bigmac"
```

#### Get Brent Crude price history:
```bash
curl "http://localhost:3000/api/v1/index/history?type=oil_brent&country=GLOBAL"
```

#### Get Big Mac prices for China:
```bash
curl "http://localhost:3000/api/v1/index/history?type=bigmac&country=CHN&base=CNY"
```

### Running Migration and Import

```bash
# Step 1: Run database migration
cd backend/scripts
go run migrate_to_multi_index.go

# Step 2: Import oil prices (with FRED API key)
export FRED_API_KEY=your_key_here
go run import_oil_prices.go

# Or use demo data (no API key needed)
go run import_oil_prices.go
```

### Starting the Server

```bash
cd backend
go run cmd/server/main.go
# Server starts on http://localhost:3000
```

## Future Enhancements (Phase 2+)

### Ready for Implementation:
1. **Pork Price Index**
   - Data source: FAO STAT API
   - Requires currency conversion infrastructure
   - ~150 countries
   - Annual updates

2. **Egg Price Index**
   - Data source: World Bank + FAO
   - Similar to pork implementation
   - ~100 countries
   - Monthly/annual updates

3. **Real-time Oil Data**
   - Currently using demo data
   - Add FRED API integration with API key
   - Daily automated updates via cron
   - Backfill historical data (1987-present for Brent)

### Potential Features:
1. **Multi-index comparison**
   - Display multiple commodities on one chart
   - Compare purchasing power across different indices

2. **Custom time ranges**
   - Date picker for chart range
   - Zoom/pan functionality

3. **PPP Calculator enhancement**
   - Currently only supports Big Mac
   - Extend to support all commodity types
   - "What does oil cost in local purchasing power?"

4. **Export functionality**
   - Download chart data as CSV
   - API endpoint for bulk data export

5. **Historical exchange rates**
   - Add to commodity_prices for accurate conversions
   - Support for discontinued currencies

## Known Limitations

1. **Oil data is synthetic demo data**
   - Need FRED API key for real data
   - Demo data sufficient for development/testing
   - Production deployment should use real FRED data

2. **PPP Calculator not yet updated**
   - `/api/v1/calculator/ppp` still only works with Big Mac
   - Needs refactoring to accept index_type parameter

3. **No automated data updates**
   - Import scripts must be run manually
   - Future: add cron jobs or GitHub Actions for automated updates

4. **Limited to USD base for oil**
   - Oil is globally priced in USD
   - Base currency switcher less relevant for oil
   - Could add synthetic currency conversion in future

## Breaking Changes

None! The implementation maintains full backward compatibility:
- Existing API endpoints work without `?type=` parameter
- Frontend defaults to Big Mac index if no selection stored
- Database includes both old and new tables (can keep `big_mac_raw` as backup)

## Performance Notes

- Query performance tested with full dataset: <10ms for typical queries
- Database file size: 2.6MB (includes all indices)
- Frontend bundle size increase: ~2KB (IndexSelector component)
- No noticeable performance degradation

## Credits

- **Data Sources**:
  - Big Mac Index: © The Economist Newspaper Limited
  - Crude Oil Prices: Federal Reserve Bank of St. Louis (FRED)
  - Demo data: Synthetic data based on historical trends

- **Implementation**: Multi-index architecture and Phase 1 oil support
- **Architecture**: Unified commodity_prices table design

---

## Quick Start for Developers

```bash
# 1. Clone and navigate
git checkout feat/multi-index-support
cd the-mac-index

# 2. Set up database
cd backend/scripts
go run seed.go                    # Initial Big Mac data
go run migrate_to_multi_index.go  # Migrate to new schema
go run import_oil_prices.go       # Add oil prices

# 3. Start backend
cd ../
go run cmd/server/main.go

# 4. Start frontend (separate terminal)
cd ../../frontend
npm install
npm run dev

# 5. Open http://localhost:5173
# Select "Brent Crude Oil" from the index dropdown!
```

---

**Version**: 1.0.0  
**Implementation Date**: 2024-03-30  
**Status**: ✅ Phase 1 Complete - Ready for Review
