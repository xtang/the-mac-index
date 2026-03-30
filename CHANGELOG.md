# Changelog

## [Unreleased] - Phase 1: Multi-Index Support

### 🎉 Added
- **Multi-commodity index support**: Platform now supports multiple purchasing power indices
- **Crude Oil Index**: Added Brent Crude and WTI oil price tracking
- **New API endpoint**: `GET /api/v1/indices` - Returns all available commodity indices with metadata
- **Index selector UI**: Frontend dropdown to switch between Big Mac, Brent Oil, and WTI Oil
- **Database migration**: New unified `commodity_prices` table supporting multiple index types
- **Data import scripts**: 
  - `backend/scripts/migrate_to_multi_index.go` - Migrates Big Mac data to new schema
  - `backend/scripts/import_oil_prices.go` - Imports oil price data (FRED API or demo data)

### 🔄 Changed
- **API endpoints updated**: `/countries` and `/index/history` now accept optional `?type=` parameter
- **Backend database layer**: Refactored to support multiple index types
- **Frontend state management**: Added index type state and dynamic chart labeling
- **Chart component**: Y-axis labels now update based on selected commodity (e.g., "USD/barrel" for oil)

### 🛠️ Technical Details
- Database: DuckDB with new `commodity_prices` unified table
- Backward compatible: All existing endpoints work without changes
- Demo data: 61 synthetic oil price records (2000-2025) for development
- Ready for FRED API integration with `FRED_API_KEY` environment variable

### 📚 Documentation
- Added `docs/data-sources-analysis.md` - Research on commodity data sources
- Added `docs/schema-migration-plan.md` - Database schema design documentation
- Added `docs/MULTI_INDEX_IMPLEMENTATION.md` - Complete implementation guide

### 🚧 Known Limitations
- Oil data is currently demo/synthetic (production should use FRED API)
- PPP calculator not yet updated for multi-index support
- No automated data refresh mechanism yet

### 🔮 Future (Phase 2)
- Pork Price Index (FAO data)
- Egg Price Index (World Bank + FAO)
- Real-time FRED API integration
- Multi-index comparison charts
- Automated data updates via cron/GitHub Actions

---

## [1.0.0] - 2024-03-XX (Previous Release)

### Initial Release
- Big Mac Index visualization
- Terminal-themed UI
- Country comparison
- Base currency switching
- Historical price charts
- PPP calculator
