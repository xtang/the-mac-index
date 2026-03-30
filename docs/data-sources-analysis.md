# Data Sources Analysis for Multi-Index Support

## Executive Summary

This document analyzes data sources for extending the Purchasing Power Terminal to support additional commodity indices beyond the Big Mac Index.

## Recommended Data Sources

### 1. Crude Oil Price Index ⭐ **PRIMARY RECOMMENDATION**

#### Source: FRED (Federal Reserve Economic Data)
- **API Endpoint**: `https://api.stlouisfed.org/fred/series/observations`
- **Series IDs**:
  - Brent Crude: `DCOILBRENTEU` (Europe Brent Spot Price FOB)
  - WTI Crude: `DCOILWTICO` (Crude Oil Prices: West Texas Intermediate)
- **Coverage**: Daily data from 1987-present (Brent), 1986-present (WTI)
- **Geographic**: Global benchmark prices (already in USD)
- **Update Frequency**: Daily (weekdays)
- **Authentication**: Free API key (register at https://fred.stlouisfed.org/docs/api/api_key.html)
- **Rate Limits**: Reasonable for our use case
- **Data Format**: JSON or XML
- **Terms of Use**: Free for non-commercial and commercial use with attribution

#### Why Crude Oil First?
1. **Simplest to implement**: Already priced globally in USD, no currency conversion needed
2. **Universal relevance**: Affects every economy
3. **High data quality**: Authoritative source, consistently updated
4. **Long historical coverage**: Enables meaningful PPP comparisons
5. **Single global benchmark**: Unlike food commodities with regional variations

#### Sample API Call:
```bash
curl "https://api.stlouisfed.org/fred/series/observations?series_id=DCOILBRENTEU&api_key=YOUR_KEY&file_type=json&sort_order=desc&limit=1000"
```

#### Data Schema:
```json
{
  "observations": [
    {
      "realtime_start": "2024-01-15",
      "realtime_end": "2024-01-15",
      "date": "2024-01-15",
      "value": "78.29"
    }
  ]
}
```

#### Implementation Notes:
- Store both Brent and WTI as separate index_type values or add a variant field
- Default to Brent (more internationally representative)
- Map global price to all countries (oil is universally traded)
- No currency conversion needed - oil is priced in USD globally

---

### 2. Pork Price Index

#### Primary Source: FAO (Food and Agriculture Organization)
- **API**: FAOSTAT API (http://www.fao.org/faostat/en/#data/PP)
- **Dataset**: Producer Prices - Annual
- **Item Code**: Meat, pig (various item codes by type)
- **Coverage**: 150+ countries, 1991-present
- **Update Frequency**: Annual (with ~1 year lag)
- **Format**: CSV bulk download or REST API
- **Authentication**: Free, registration recommended
- **Currency**: Local currency (requires conversion)

#### Alternative Source: USDA Economic Research Service
- **Dataset**: Livestock and Meat Domestic Data
- **Coverage**: Primarily US, limited international
- **Update Frequency**: Monthly
- **Format**: Excel/CSV downloads
- **Best for**: US baseline price reference

#### Recommended Approach:
- Use FAO for international coverage
- Use USDA for high-frequency US baseline
- Normalize to USD/kg for comparability
- Handle seasonal variations with rolling averages

#### Implementation Challenges:
1. **Currency conversion required**: Need historical exchange rates
2. **Lower frequency**: Annual vs semi-annual (Big Mac) or daily (oil)
3. **Data gaps**: Not all countries report consistently
4. **Price variation**: Different cuts, wholesale vs retail

#### Sample FAO API Call:
```
GET http://fenixservices.fao.org/faostat/api/v1/en/data/PP?area=231&element=5532&item=1035
```

---

### 3. Egg Price Index

#### Primary Source: FAO Producer Prices
- **Dataset**: FAOSTAT Producer Prices (PP)
- **Item**: Eggs, hen, in shell
- **Item Code**: 1062
- **Coverage**: 100+ countries, 1991-present
- **Update Frequency**: Annual
- **Format**: CSV/API

#### Alternative Source: World Bank Commodity Prices (Pink Sheet)
- **Dataset**: Commodity Markets ("Pink Sheet")
- **API**: World Bank Data API
- **Endpoint**: `https://api.worldbank.org/v2/country/indicators/PPOULTRY`
- **Coverage**: Global benchmark price, monthly
- **Format**: JSON/XML
- **Authentication**: None required

#### Recommended Approach:
- World Bank for global benchmark price trend
- FAO for country-specific pricing
- Normalize to USD/dozen or USD/kg

#### Sample World Bank API Call:
```
GET https://api.worldbank.org/v2/country/all/indicator/PPOULTRY?format=json&date=2020:2024&per_page=1000
```

---

## Historical Exchange Rate Data (Required for Food Commodities)

### Source: FRED or European Central Bank
- **FRED**: Multiple bilateral exchange rate series (e.g., `DEXCHUS` for CNY/USD)
- **ECB**: Historical exchange rates API (free, comprehensive)
- **Coverage**: All major currencies, daily data
- **Use case**: Convert local pork/egg prices to USD for comparison

---

## Data Source Comparison Matrix

| Commodity | Primary Source | Coverage | Frequency | Complexity | Ready for V1? |
|-----------|---------------|----------|-----------|------------|---------------|
| **Crude Oil (Brent)** | FRED | Global | Daily | ⭐ Low (no conversion) | ✅ **YES** |
| **Crude Oil (WTI)** | FRED | Global | Daily | ⭐ Low (no conversion) | ✅ **YES** |
| **Pork** | FAO | 150+ countries | Annual | 🟡 Medium (conversion + gaps) | ⚠️ V2 |
| **Eggs** | FAO + World Bank | 100+ countries | Annual/Monthly | 🟡 Medium (conversion) | ⚠️ V2 |
| **Big Mac** | The Economist | 110 countries | Semi-annual | ⭐ Low (already implemented) | ✅ Current |

---

## Recommended Implementation Phases

### Phase 1: Crude Oil (This PR)
- **Timeline**: 10-14 days
- **Rationale**: 
  - Lowest complexity
  - No currency conversion
  - Validates architecture changes
  - High user value (energy costs affect everyone)
- **Data source**: FRED API (Brent Crude)

### Phase 2: Pork & Eggs (Future PR)
- **Timeline**: 7-10 days after Phase 1 validated
- **Rationale**:
  - Requires currency conversion infrastructure
  - More complex data handling
  - Lower update frequency
  - Benefits from validated multi-index architecture

---

## API Keys & Access

### Required Immediately:
1. **FRED API Key**:
   - Register: https://fred.stlouisfed.org/
   - Free tier: 120 requests/minute
   - Store in environment variable: `FRED_API_KEY`

### For Phase 2:
1. **FAO API** (optional registration for higher limits)
2. **World Bank API** (no key required)

---

## Data Licensing & Attribution

All sources require proper attribution:

```
### Data Sources
- Big Mac Index: © The Economist Newspaper Limited
- Crude Oil Prices: Federal Reserve Bank of St. Louis (FRED)
- Pork Prices: Food and Agriculture Organization (FAO)
- Egg Prices: World Bank Commodity Price Data / FAO
```

---

## Next Steps

1. ✅ Register for FRED API key
2. ✅ Test FRED API endpoints with sample queries
3. ✅ Define database schema changes (see schema-migration-plan.md)
4. ✅ Implement crude oil data fetcher
5. ⏳ Plan Phase 2 data sources after validation

---

**Document Version**: 1.0  
**Last Updated**: 2024-03-30  
**Author**: Development Team  
**Status**: Approved for Phase 1 Implementation
