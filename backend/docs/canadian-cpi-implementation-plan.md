# Canadian CPI Data Implementation Plan

## Overview
This document outlines the plan for implementing Canadian CPI data fetching and storage, mirroring the existing US CPI implementation while adapting to Statistics Canada's Web Data Service API. The implementation will fetch complete historical CPI data from 1914 to present and store it in the same monthly lookup format as the US data.

## Data Source
**Statistics Canada Web Data Service (WDS)**
- REST API over HTTPS
- Returns data in JSON format
- Base URL: `https://www150.statcan.gc.ca/t1/wds/rest/`

## Key CPI Tables and Product IDs

### Primary CPI Table
- **Table ID**: 18-10-0004-01
- **Product ID (PID)**: 18100004
- **Title**: Consumer Price Index, monthly, not seasonally adjusted
- **Coverage**: Canada, provinces, territories, and major cities
- **Base Year**: 2002=100

### Additional Relevant Tables
- **18-10-0004-02**: CPI by geography, all-items, monthly percentage change
- **18-10-0004-13**: CPI by product group, monthly percentage change
- **18-10-0256-01**: CPI statistics and Bank of Canada core inflation measures

## API Methods to Use

### 1. getCubeMetadata
- **Endpoint**: `POST https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata`
- **Purpose**: Retrieve metadata for a specific table (product IDs, dimensions, variables)
- **Use Case**: Initial setup to understand table structure and available vectors

### 2. getFullTableDownloadCSV (PRIMARY METHOD FOR HISTORICAL DATA)
- **Endpoint**: `GET https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/18100004/en`
- **Purpose**: Download complete historical CPI data (from 1914 to present)
- **Use Case**: Initial data load and periodic full refreshes
- **Returns**: URL to download ZIP file containing full CSV data

### 3. getDataFromVectorsAndLatestNPeriods
- **Endpoint**: `POST https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods`
- **Purpose**: Retrieve recent CPI data points for specific vectors
- **Use Case**: Monthly incremental updates (limited by latestN parameter)
- **Limitation**: Only retrieves limited recent periods, not full history

### 4. getCodeSets
- **Endpoint**: `GET https://www150.statcan.gc.ca/t1/wds/rest/getCodeSets`
- **Purpose**: Get descriptions for all codes used in the data
- **Use Case**: Map product groups and geographic codes to readable names

## Canadian CPI Series Mapping

### Proposed CPI Series (aligned with US implementation)
```typescript
export enum CpiSeriesIdCanada {
  CPI_ALL_ITEMS = 'v41690973',        // All-items, Canada
  CPI_FOOD = 'v41690974',             // Food
  CPI_SHELTER = 'v41690975',          // Shelter
  CPI_HOUSEHOLD = 'v41690976',        // Household operations, furnishings and equipment
  CPI_CLOTHING = 'v41690977',         // Clothing and footwear
  CPI_TRANSPORTATION = 'v41690978',   // Transportation
  CPI_HEALTH = 'v41690979',           // Health and personal care
  CPI_RECREATION = 'v41690980',       // Recreation, education and reading
  CPI_ALCOHOL_TOBACCO = 'v41690981',  // Alcoholic beverages, tobacco products and recreational cannabis
  CPI_ALL_ITEMS_EXCL_FOOD_ENERGY = 'v41693271', // All-items excluding food and energy
}
```

*Note: Vector IDs are examples and need to be verified using getCubeMetadata*

## Implementation Steps

### Phase 1: Create Canadian CPI API Client
1. Create `stats-canada-api.ts` in `/backend/src/lib/`
2. Implement methods:
   - `fetchCubeMetadata()` - Get table structure and vector IDs
   - `fetchFullTableCsv()` - Download complete historical data (1914-present)
   - `parseCsvToDataPoints()` - Parse CSV data into our data point format
   - `fetchCpiDataByVectors()` - Fetch recent CPI data using vector IDs (for updates)
   - `transformStatsCanadaData()` - Convert to our standard monthly lookup format

### Phase 2: Create Lambda Handler
1. Create `get-canadian-cpi-data.ts` in `/backend/src/handlers/`
2. Implement similar structure to US handler:
   - Accept series IDs as input
   - Fetch data from Statistics Canada API
   - Transform to simplified format
   - Save to S3 under `data/ca/` prefix

### Phase 3: Update SAM Template
1. Add new Lambda function resource
2. Configure environment variables
3. Set up EventBridge schedule (monthly updates)

### Phase 4: Testing
1. Create unit tests for API client
2. Create integration tests for Lambda handler
3. Add sample data files for testing

## Data Format Comparison

### US BLS API Response
```json
{
  "seriesID": "CUUR0000SA0",
  "year": "2024",
  "period": "M01",
  "value": "308.417",
  "periodName": "January"
}
```

### Statistics Canada API Response (Expected)
```json
{
  "vectorId": "v41690973",
  "refPer": "2024-01",
  "value": "158.5",
  "scalarFactorCode": 0,
  "decimals": 1
}
```

### Our Simplified Format (Same for both)
```json
{
  "lastUpdated": "2024-01-01T00:00:00Z",
  "source": "Statistics Canada Series v41690973",
  "months": {
    "1914-01": 5.7,
    "1914-02": 5.7,
    "...": "...",
    "2024-01": 158.5,
    "2024-02": 159.1
  }
}
```

**Key Points:**
- Contains ALL historical data from 1914 to present
- Monthly values stored with "YYYY-MM" keys for easy lookup
- Identical format to US implementation for consistency
- No need for year-by-year fetching like US BLS API

## Key Differences from US Implementation

1. **API Structure**: Statistics Canada uses vector IDs instead of series IDs
2. **Base Year**: Canada uses 2002=100, US uses 1982-84=100
3. **Geographic Granularity**: Canada provides provincial/territorial data
4. **Update Frequency**: Daily updates at 8:30am EST vs monthly US updates
5. **Rate Limits**: 50 requests/second (25 per IP) vs BLS's more restrictive limits

## Configuration Requirements

### Environment Variables
- `STATS_CANADA_API_KEY` (if required - documentation unclear)
- `WAGE_GROWTH_BUCKET` (reuse existing)

### AppConfig Updates
- Add Canadian CPI configuration section
- Vector ID mappings
- Update schedules

## Error Handling Considerations

1. Handle bilingual responses (English/French)
2. Account for different date formats
3. Handle metric differences (base year conversions if needed)
4. Implement retry logic for API failures

## Future Enhancements

1. **Provincial Data**: Extend to support provincial CPI data
2. **Bilingual Support**: Store both English and French descriptions
3. **Historical Data**: Implement bulk historical data import
4. **Real-time Updates**: Leverage daily update capability

## Testing Strategy

1. Mock Statistics Canada API responses
2. Test data transformation accuracy
3. Verify S3 storage paths
4. Test error scenarios (API down, rate limits)

## Deployment Checklist

- [ ] Create API client library
- [ ] Implement Lambda handler
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Update SAM template
- [ ] Configure EventBridge schedule
- [ ] Add monitoring/alerts
- [ ] Update documentation
- [ ] Deploy to development
- [ ] Verify data accuracy
- [ ] Deploy to production

## Data Availability Confirmation

### Historical Data Coverage
- **Start Date**: 1914 (confirmed by Statistics Canada)
- **End Date**: Current month
- **Frequency**: Monthly data points
- **Access Method**: Full CSV download via getFullTableDownloadCSV API

### Output Format Verification
The implementation will produce JSON files identical to the US format:
- Each file contains a `months` object with keys in "YYYY-MM" format
- Values are CPI index values for each month
- Full historical data from 1914 to present in a single file
- No pagination or chunking required (unlike US BLS API)

## Notes

- Statistics Canada provides more granular geographic data than BLS
- Consider implementing a vector ID discovery mechanism
- May need to handle French language responses
- Full historical data download eliminates need for incremental backfill