# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Real Wage Growth Calculator application that helps users understand how their earnings growth compares to inflation over time. The architecture uses AWS serverless services with a SAM-based backend and a React frontend.

## Development Commands

### Backend Development
```bash
# Testing
npm run unit              # Run unit tests once
npm run unit:watch        # Run tests in watch mode  
npm run unit:ui           # Run tests with UI interface
npm run coverage          # Generate coverage report

# Code Quality
npm run lint              # Format and lint code
npm run compile           # TypeScript compilation check
npm run test              # Compile + run all tests
npm run lint:sam          # Validate SAM template

# Local Development
npm run local-us-cpi-data        # Test US CPI Lambda function locally with SAM
npm run local-canadian-cpi-data  # Test Canadian CPI Lambda function locally with SAM
npm run local-uk-cpi-data        # Test UK CPI Lambda function locally with SAM

# SAM Commands (run from backend/)
sam build                 # Build the application
sam deploy --guided       # Deploy with interactive prompts
sam validate --lint       # Validate template syntax
sam local invoke          # Test Lambda functions locally
```

### Frontend Development
```bash
# Development
npm run dev               # Start Vite dev server (port 5173)
npm run build             # Type-check and build for production
npm run preview           # Preview production build
npm run lint              # Run ESLint

# The development server is typically kept running during development
```

## Architecture

### Backend
- **AWS Lambda Functions**: Serverless functions using SAM for fetching CPI data from multiple sources (US BLS, Statistics Canada, UK ONS)
- **Infrastructure**: 
  - S3 bucket with versioning and lifecycle policies
  - CloudFront distribution with CORS configuration
  - AppConfig for centralized configuration
  - Application Insights for monitoring
- **Data Sources**:
  - US: Bureau of Labor Statistics API (requires API key)
  - Canada: Statistics Canada Web Data Service
  - UK: Office for National Statistics (Excel files)

### Frontend
- **React 19 SPA**: Modern web application with TypeScript
- **State Management**: Redux Toolkit 2.8 with listener middleware for persistence
- **Routing**: React Router 7 with lazy loading
- **UI/UX**: 
  - Glass-morphism design with Tailwind CSS 4.1
  - Framer Motion animations
  - Dark mode support
  - Responsive design
- **Data Visualization**: Recharts (to be implemented)

## Key Patterns and Conventions

### Backend Patterns
- **TypeScript** with ES modules and path aliases (`@/lib/*`, `@/handlers/*`)
- **AWS Lambda Powertools** for structured logging, tracing, and metrics
- **Middy middleware** for Lambda request/response handling
- **Zod schemas** for runtime validation
- **Environment-based configuration** using AWS AppConfig
- **Vitest** for testing with comprehensive mocking of AWS services

### Frontend Patterns
- **Component Structure**: Organized by feature (calculator, layout, ui, providers)
- **State Management**: Redux Toolkit with typed hooks
- **Styling**: Tailwind CSS with custom glass-morphism utilities
- **Error Handling**: Toast notifications for user feedback
- **Data Persistence**: LocalStorage via Redux listener middleware
- **Type Safety**: Strict TypeScript with comprehensive interfaces

## Project Structure

```
backend/src/
├── handlers/          # Lambda function handlers
│   ├── get-us-cpi-data.ts         # US BLS CPI data fetcher
│   ├── get-canadian-cpi-data.ts   # Canadian Stats Canada CPI data fetcher
│   └── get-uk-cpi-data.ts         # UK ONS CPI data fetcher
├── lib/              # Shared utilities
│   ├── aws.*.ts      # AWS service integrations (S3, AppConfig)
│   ├── bls-api.ts    # US Bureau of Labor Statistics API client
│   ├── stats-canada-api.ts # Statistics Canada API client
│   ├── uk-ons-api.ts # UK Office for National Statistics API client
│   ├── cpi-shared.ts # Shared CPI processing utilities
│   ├── logger.ts     # Structured logging
│   └── utils.ts      # General utilities
└── test/             # Test files mirroring src structure

frontend/src/
├── components/
│   ├── calculator/   # Wage entry components
│   ├── layout/       # App structure components
│   ├── providers/    # Context providers
│   └── ui/          # Reusable UI components
├── hooks/           # Custom React hooks
├── routes/          # Route components
├── store/           # Redux store and slices
├── types/           # TypeScript definitions
├── utils/           # Utility functions
└── constants/       # App constants
```

## Testing Strategy

### Backend Testing
- Unit tests for all major components using Vitest
- Mocking strategy for external dependencies (AWS SDK, API calls)
- Real logger output preserved for debugging
- Test environment variables pre-configured

### Frontend Testing (to be implemented)
- Component testing with React Testing Library
- Redux store testing
- E2E tests for critical user flows

## Current State

### Backend
- **US CPI Lambda**: ✅ Operational for fetching 11 BLS CPI series with API key authentication
- **Canadian CPI Lambda**: ✅ Operational for fetching 10 Statistics Canada CPI series
- **UK CPI Lambda**: ✅ Operational for fetching UK ONS CPI series
- **CORS Configuration**: ✅ Configurable via CloudFormation parameter
- **Infrastructure**: ✅ Fully deployed with monitoring

### Frontend
- **Foundation (Phase 1)**: ✅ Complete - Project setup, routing, theme system
- **Data Layer (Phase 2)**: ✅ Complete - Redux store, CPI data fetching
- **Entry Components (Phase 3)**: 🟡 In Progress
  - ✅ Wage entry form with validation
  - ✅ Table with inflation calculations
  - ✅ Entry mode locking
  - ✅ Clear all with confirmation
  - ✅ Toast notifications
  - ⏳ Mobile responsive improvements needed
- **Visualization (Phase 4)**: ⏳ Not started - Charts and statistics
- **Sharing (Phase 5)**: ⏳ Not started - URL sharing, export features

## Recent Updates

### Backend
1. **CORS Configuration**: Added `AllowedOrigins` parameter for production deployments
2. **S3 CORS Rules**: Configured bucket CORS for frontend access
3. **CloudFront Headers**: Custom response headers policy for CORS

### Frontend
1. **Entry Mode Locking**: Prevents mixing annual and paycheck entries
2. **Enhanced Table**:
   - Today's value column (inflation-adjusted)
   - Percentage change columns (nominal & real)
   - Color-coded growth indicators
   - Reordered columns for better UX
3. **Form Improvements**:
   - Fixed amount input validation (step="0.01")
   - Allow future dates with CPI fallback
   - Fixed date display timezone issues
4. **UI Components**:
   - ConfirmDialog for destructive actions
   - CPILoadingOverlay for data fetching
   - Toast notifications with react-hot-toast
5. **Inflation Calculator**: New utility module for CPI calculations

## S3 Data Structure

```
s3://bucket/
├── cpi/
│   ├── processed/     # Frontend-ready data (via CloudFront)
│   │   ├── us/        # US CPI data (CPI_U_ALL.json, CPI_U_FOOD.json, etc.)
│   │   ├── ca/        # Canadian CPI data (CPI_CA_ALL.json, CPI_CA_FOOD.json, etc.)
│   │   └── uk/        # UK CPI data (CPI_UK_ALL.json, CPI_UK_FOOD.json, etc.)
│   └── raw/          # Raw API responses for troubleshooting (internal only)
│       ├── us/        # Raw BLS API responses
│       ├── ca/        # Raw Statistics Canada API responses
│       └── uk/        # Raw UK ONS API responses
└── static/           # Frontend React app files (future)
```

## Development Guidelines

### General
- Always run linting after modifying code: `npm run lint`
- Use conventional commit messages
- Test locally before deploying

### Backend Specific
- Validate SAM template changes: `sam validate --lint`
- Use shared utilities in `cpi-shared.ts` for consistency
- Follow Lambda pattern: fetch → save raw → transform → save processed
- S3 key structure: `cpi/{processed|raw}/{country-code}/SERIES_NAME.json`

### Frontend Specific
- Follow existing component patterns
- Use typed Redux hooks (`useAppDispatch`, `useAppSelector`)
- Add toast notifications for user actions
- Ensure mobile responsiveness
- Update IMPLEMENTATION_PLAN.md as features are completed

## Adding New Countries

To add EU or other countries:

1. **Backend - Create API client** (e.g., `eu-ecb-api.ts`) following existing patterns
2. **Backend - Create Lambda handler** using shared utilities:
   ```typescript
   const rawKeys = await saveRawCpiData(rawData, seriesIds, 'eu', 'EU ECB');
   const simplifiedData = transformMultiSeriesCpiData(rawData, seriesIds, 'EU ECB');
   const keys = await saveProcessedCpiData(simplifiedData, seriesIds, 'eu', 'EU ECB');
   ```
3. **Backend - Update SAM template** with new Lambda function
4. **Frontend - Update constants** with country metadata
5. **Frontend - Add sample data** for the new country

## Claude Code Guidelines

- Always present a todo or implementation plan before proceeding. I would like to approve it first.
- When working with CPI data, use the shared utilities for consistency
- Before a major refactor, please ask if I would like to commit uncommitted changes first
- Keep documentation files updated as you make progress
- Check official docs with websearch to ensure you're following modern best practices
- Run the app locally to test changes when possible

## Quick CLI Tips

### Backend
- Get CloudFront domain: `sam list stack-outputs --output json | jq -r '.[] | select(.OutputKey == "CloudFrontDistributionDomainName") | .OutputValue'`
- Test specific Lambda: `sam local invoke FunctionName -e events/test-event.json`
- View logs: `sam logs -n FunctionName --tail`

### Frontend
- Clear localStorage: Open DevTools Console and run the utility function
- Test dark mode: Use the theme toggle in the header
- Load sample data: Click "Load Sample Data" when no entries exist

## Environment Variables

### Backend (Lambda Functions)
- `WAGE_GROWTH_BUCKET` - S3 bucket name
- `APPCONFIG_APP_ID` - AppConfig application ID
- `APPCONFIG_ENV_ID` - AppConfig environment ID
- `APPCONFIG_PROFILE_ID` - AppConfig profile ID
- `POWERTOOLS_SERVICE_NAME` - Service name for logging
- `POWERTOOLS_METRICS_NAMESPACE` - CloudWatch metrics namespace
- `LOG_LEVEL` - Logging level (INFO, DEBUG, etc.)

### Frontend
- `VITE_CPI_DOMAIN` - CloudFront domain for CPI data

## Maintenance Advice

- Before installing packages, ensure they are currently maintained
- Review dependency updates regularly
- Monitor Lambda cold starts and optimize if needed
- Check CPI data source APIs for changes
- Keep TypeScript and ESLint configs up to date