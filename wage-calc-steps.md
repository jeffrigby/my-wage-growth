# Real Wage Growth Calculator - Implementation Steps

## Project Overview

### Purpose
This web application helps users understand their real wage growth versus inflation over time. Many people don't realize that inflation erodes purchasing power - even if they're earning more money nominally, they might actually be earning less in real terms. This tool makes that invisible loss visible through clear visualizations and calculations.

### How It Works
1. **Users enter their pre-tax earnings data** - at least 2 data points with dates
   - Can be annual W-2 totals, weekly paychecks, or biweekly paychecks
   - Must be pre-tax and pre-deduction amounts for accuracy
   - All entries must use the same time period type (all annual or all weekly)

2. **The system fetches current CPI (Consumer Price Index) data**
   - Automatically updated monthly from the Bureau of Labor Statistics (US data for Phase 1)
   - Uses CPI-U (All Urban Consumers) data series CUUR0000SA0
   - Future phases will support other countries' inflation data

3. **Real-time calculations show**:
   - Nominal wages (actual dollars earned)
   - Real wages (inflation-adjusted to today's dollars)
   - Year-over-year growth rates
   - Best/worst years for real wage growth
   - Total purchasing power gained or lost to inflation

4. **Users can share their results** via URL without creating an account

### Technical Requirements

#### Core Features
- Single Page Application (SPA) with React and TypeScript
- Dark mode support from day one
- Responsive design for desktop and mobile
- All calculations performed in the browser
- No user accounts needed for Phase 1
- URL-based sharing using compressed data in hash

#### Data Entry Requirements
- Minimum 2 wage entries to show growth
- Support 3 entry types:
  - **Point-in-time**: Specific date with exact CPI matching
  - **Annual-Simple**: Full year earnings using December CPI
  - **Annual-Averaged**: Full year earnings using 12-month average CPI
- Clear user guidance that all entries must be consistent (no mixing annual with weekly)

#### Visualizations
- Line chart comparing nominal vs real wages over time
- Shaded area showing inflation impact
- Statistics dashboard with:
  - Best year (highest real wage and % growth)
  - Worst year (lowest real wage or biggest decline)
  - Total real wage growth percentage
  - Average annual growth rate
  - Cumulative dollars lost to inflation
  - Win/loss record against inflation by year

#### Architecture
- **Frontend**: React SPA hosted on S3/CloudFront
- **Backend**: Scheduled Lambda fetching monthly CPI data from BLS API
- **Data Flow**: Lambda → S3 JSON file → CloudFront → Frontend fetches on load
- **State Management**: Redux Toolkit with persistence for user entries
- **Styling**: Tailwind CSS with custom design system

#### Future International Support (Phase 2+)
While Phase 1 focuses on US CPI data, the architecture should support future expansion to other countries:
- **Data Structure**: Design to accommodate multiple inflation indices (UK RPI/CPI, EU HICP, etc.)
- **Currency Handling**: Store currency code with entries for future multi-currency support
- **Country Selection**: Plan for country picker UI and per-country data sources
- **Lambda Architecture**: Design Lambda to potentially fetch from multiple national statistics APIs
- **Localization**: Consider i18n from the start for UI text

Example future data structure:
```json
{
  "US": {
    "lastUpdated": "2024-05-15",
    "source": "BLS",
    "currency": "USD",
    "months": { "2024-04": 313.548 }
  },
  "UK": {
    "lastUpdated": "2024-05-15", 
    "source": "ONS",
    "currency": "GBP",
    "months": { "2024-04": 125.2 }
  }
}
```

## TODO Lists

### Backend TODO List
- [ ] **B-Step-1**: Create AWS infrastructure with SAM (S3 buckets, Lambda, EventBridge, CloudFront)
- [ ] **B-Step-2**: Build CPI Lambda function to fetch from BLS API and transform data
- [ ] **B-Step-3**: Configure Lambda scheduling with EventBridge for monthly runs  
- [ ] **B-Step-4**: Set up CloudFront distribution with proper caching
- [ ] **B-Step-5**: Run initial test and generate first CPI data file

**Output**: CloudFront URL for CPI data (e.g., `https://[id].cloudfront.net/data/cpi-latest.json`)

### Frontend TODO List
**Input**: CPI data URL from backend  
- [ ] **F-Step-1**: Initialize React project with Vite, TypeScript, and dependencies
- [ ] **F-Step-2**: Define TypeScript types for WageEntry and CPIData
- [ ] **F-Step-3**: Set up Redux store with cpiData, wageEntries, and ui slices
- [ ] **F-Step-4**: Implement CPI data fetching from CloudFront URL
- [ ] **F-Step-5**: Create CPI calculation utilities for inflation adjustments
- [ ] **F-Step-6**: Build core UI layout with routing and dark mode
- [ ] **F-Step-7**: Create entry form and list components
- [ ] **F-Step-8**: Build visualization components (charts and statistics)
- [ ] **F-Step-9**: Implement URL-based sharing feature
- [ ] **F-Step-10**: Add error handling and polish
- [ ] **F-Step-11**: Optimize performance and bundle size
- [ ] **F-Step-12**: Create production build configuration

---

## Backend Workflow (Phase 1A - Build First)

### Step 1: AWS Infrastructure Setup
1. Create SAM template with:
   - S3 bucket for static site hosting
   - S3 bucket (or folder) for CPI JSON file
   - Lambda function for CPI updates
   - EventBridge rule for monthly scheduling
   - CloudFront distribution
2. Configure S3:
   - Enable static website hosting
   - Set public read on CPI data path
   - Configure CORS for CPI JSON access

### Step 2: CPI Lambda Function
1. Create Lambda function (Python recommended):
   - Use BLS API to fetch CPI data (Series: CUUR0000SA0)
   - No API key needed for basic access (optional for higher limits)
   - Fetch last 20 years of monthly data
   - Structure code to easily add other country APIs later
2. Process and transform data:
   ```json
   {
     "lastUpdated": "2024-05-15T12:00:00Z",
     "source": "BLS Series CUUR0000SA0",
     "months": {
       "2024-04": 313.548,
       "2024-03": 312.332,
       "2024-02": 310.326
     }
   }
   ```
3. Write to S3:
   - Path: `/data/cpi-latest.json` (future: `/data/us-cpi-latest.json`)
   - Set Cache-Control headers
   - Make publicly readable

### Step 3: Lambda Scheduling
1. Create EventBridge rule:
   - Schedule: 15th of each month
   - Target: CPI Lambda function
2. Add error handling:
   - Retry logic for BLS API
   - CloudWatch logging
   - SNS alert on failures (optional)

### Step 4: CloudFront Configuration  
1. Set up CloudFront distribution:
   - Origin 1: S3 static site
   - Origin 2: S3 CPI data
   - Cache behaviors for each
2. Configure caching:
   - Long cache for static assets
   - 24-hour cache for CPI JSON
3. Enable compression

### Step 5: Initial Data and Testing
1. Manually run Lambda to generate initial CPI data
2. Verify JSON file in S3
3. Test CloudFront access to CPI file
4. Note the CPI data URL: `https://[cloudfront-id].cloudfront.net/data/cpi-latest.json`

---

## Frontend Workflow (Phase 1B - Build Second)

### Step 1: Project Setup
1. Create React project with Vite and TypeScript
2. Install dependencies:
   - React Router v6
   - Redux Toolkit
   - Tailwind CSS (with dark mode)
   - Recharts
   - axios or fetch API
   - date-fns
   - pako
3. Configure environment variable:
   ```env
   VITE_CPI_DATA_URL=https://[cloudfront-id].cloudfront.net/data/cpi-latest.json
   # Future: VITE_CPI_DATA_BASE_URL for multiple countries
   ```
4. Set up project structure with internationalization in mind

### Step 2: TypeScript Types
1. Define core interfaces with future country support in mind:
   ```typescript
   interface WageEntry {
     id: string;
     date: Date;
     amount: number;
     entryType: 'point-in-time' | 'annual-simple' | 'annual-averaged';
     label?: string;
     // For future: countryCode?: string;
     // For future: currencyCode?: string;
   }
   
   interface CPIData {
     lastUpdated: string;
     source: string;
     months: Record<string, number>;
     // For future: currency?: string;
     // For future: countryCode?: string;
   }
   ```
2. Create type guards and validators
3. Set up strict TypeScript config

### Step 3: Redux Store Setup
1. Configure store with Redux Toolkit
2. Create slices:
   - `cpiData` - Stores fetched CPI data (structure for future multi-country)
   - `wageEntries` - User's wage entries
   - `ui` - Theme and view preferences
   - `settings` - Future: selected country, currency preferences
3. Set up Redux Persist for wage entries only
4. Create typed hooks
5. Design state shape to accommodate future country selection

### Step 4: CPI Data Fetching
1. Create CPI fetch utility:
   ```typescript
   async function fetchCPIData() {
     const response = await fetch(import.meta.env.VITE_CPI_DATA_URL);
     return response.json();
   }
   ```
2. Implement app initialization:
   - Fetch CPI on app load
   - Show loading screen
   - Cache in Redux store
   - Handle errors gracefully
   - Store with structure that could support multiple countries
3. Add localStorage backup for offline use
4. Display "US CPI Data" label (preparing for country selector)

### Step 5: CPI Calculation Utilities
1. Create calculation functions:
   - Find closest CPI for any date
   - Get December CPI for annual
   - Calculate monthly average for year
   - Design to be country-agnostic (work with any CPI data structure)
2. Build inflation adjusters:
   - Convert to current dollars/currency
   - Calculate real growth rates
   - Use generic "current value" terminology
3. Add date validation against available CPI data

### Step 6: Core UI Layout
1. Set up app shell:
   - Header with navigation
   - Dark mode toggle
   - Main content area
   - Footer with CPI update date
   - Space for future country selector in header
2. Configure React Router:
   - Home route (`/`)
   - Shared route (`/shared/:data`)
3. Add responsive design with Tailwind
4. Use currency formatting that adapts to locale

### Step 7: Entry Form Components
1. Build wage entry form:
   - Date picker (adapts to entry type)
   - Currency input formatting (use Intl.NumberFormat for future multi-currency)
   - Entry type selector
   - Clear instructions about pre-tax
2. Create entries list:
   - Display all entries
   - Edit inline
   - Delete with confirmation
   - Auto-sort by date
   - Format amounts with proper currency symbol ($)

### Step 8: Visualization Components
1. Create main chart:
   - Nominal vs real wages lines
   - Inflation impact shading
   - Interactive tooltips
   - Responsive sizing
   - Currency-agnostic labeling (use Intl.NumberFormat)
2. Build statistics dashboard:
   - Best/worst years
   - Growth percentages
   - Inflation impact
   - Years beating inflation
   - Proper currency formatting throughout
3. Add chart export functionality

### Step 9: URL-Based Sharing
1. Implement share feature:
   - Serialize wage entries only
   - Compress with pako
   - Encode in URL hash
   - Generate shareable link
   - Plan for country code in future shared data
2. Create shared view:
   - Decode URL data
   - Fetch fresh CPI data
   - Display read-only results
   - "Create Your Own" button
   - Default to US data for Phase 1

### Step 10: Error Handling and Polish
1. Add error boundaries
2. Handle CPI fetch failures:
   - Use cached data if available
   - Show clear error message
   - Allow manual retry
   - Use generic language (avoid US-specific terms)
3. Add loading states and skeletons
4. Include demo data option
5. Write user-facing text to be easily translatable

### Step 11: Performance Optimization
1. Optimize bundle size:
   - Lazy load chart library
   - Code split routes
   - Tree shake unused code
2. Add performance monitoring
3. Implement service worker for offline support

### Step 12: Production Build Configuration
1. Set up build configuration with proper environment variables
2. Configure production optimizations
3. Create .env.example file for documentation
4. Ensure all TypeScript errors are resolved

---

## Phase 2 Planning

### International Expansion
- Multiple country support with country selector
- Additional Lambda functions for each country's statistics API:
  - UK: Office for National Statistics (ONS) API
  - EU: Eurostat API for HICP
  - Canada: Statistics Canada API
  - Australia: Australian Bureau of Statistics API
- Currency conversion options
- Localized UI with i18n support
- Country-specific inflation indices (CPI, RPI, HICP, etc.)

### Backend Additions
- API Gateway for user endpoints
- DynamoDB for user data
- Cognito authentication
- User-specific calculations

### Frontend Enhancements
- User accounts
- Save/load calculations
- CSV import/export
- PDF reports
- Advanced visualizations