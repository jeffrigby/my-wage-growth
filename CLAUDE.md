# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Real Wage Growth Calculator application that helps users understand how their earnings growth compares to inflation over time. The architecture uses AWS serverless services with a SAM-based backend and planned React frontend.

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

# Local Development
npm run local-us-cpi-data        # Test US CPI Lambda function locally with SAM
npm run local-canadian-cpi-data  # Test Canadian CPI Lambda function locally with SAM

# SAM Commands (run from backend/)
sam build                 # Build the application
sam deploy --guided       # Deploy with interactive prompts
sam local invoke          # Test Lambda functions locally
```

## Architecture

- **Backend**: AWS Lambda functions using SAM for fetching CPI data from multiple sources (US BLS, Statistics Canada)
- **Frontend**: Planned React SPA to be hosted on S3/CloudFront
- **Data Storage**: S3 with organized structure (`cpi/processed/` and `cpi/raw/`) for CPI data and static files
- **Infrastructure**: CloudFormation via SAM template

## Key Patterns and Conventions

- **TypeScript** with ES modules and path aliases (`@/lib/*`, `@/handlers/*`)
- **AWS Lambda Powertools** for structured logging, tracing, and metrics
- **Middy middleware** for Lambda request/response handling
- **Zod schemas** for runtime validation
- **Environment-based configuration** using AWS AppConfig
- **Vitest** for testing with comprehensive mocking of AWS services

## Project Structure

```
backend/src/
├── handlers/          # Lambda function handlers
│   ├── get-us-cpi-data.ts         # US BLS CPI data fetcher
│   └── get-canadian-cpi-data.ts   # Canadian Stats Canada CPI data fetcher
├── lib/              # Shared utilities
│   ├── aws.*.ts      # AWS service integrations (S3, AppConfig)
│   ├── bls-api.ts    # US Bureau of Labor Statistics API client
│   ├── stats-canada-api.ts # Statistics Canada API client
│   ├── cpi-shared.ts # Shared CPI processing utilities
│   ├── logger.ts     # Structured logging
│   └── utils.ts      # General utilities
└── test/             # Test files mirroring src structure
```

## Testing Strategy

- Unit tests for all major components using Vitest
- Mocking strategy for external dependencies (AWS SDK, BLS API)
- Real logger output preserved for debugging
- Test environment variables pre-configured

## Current State

- **US CPI Lambda**: Operational for fetching 11 BLS CPI series with API key authentication
- **Canadian CPI Lambda**: Operational for fetching 10 Statistics Canada CPI series (no auth required)
- **Shared utilities**: Refactored common functionality for easy international expansion
- **S3 integration**: Organized structure with raw and processed data storage
- **CloudFront distribution**: Configured with proper caching behaviors for `/cpi/*` paths
- **Frontend development**: Not yet started
- **Infrastructure**: Designed and tested for multi-country CPI data

## S3 Data Structure

```
s3://bucket/
├── cpi/
│   ├── processed/     # Frontend-ready data (via CloudFront)
│   │   ├── us/        # US CPI data (CPI_U_ALL.json, CPI_U_FOOD.json, etc.)
│   │   └── ca/        # Canadian CPI data (CPI_CA_ALL.json, CPI_CA_FOOD.json, etc.)
│   └── raw/          # Raw API responses for troubleshooting (internal only)
│       ├── us/        # Raw BLS API responses
│       └── ca/        # Raw Statistics Canada API responses
└── static/           # Frontend React app files (future)
```

## Development Guidelines

- Always run linting after modifying code: `npm run lint`
- If changing the SAM template run: `sam validate --lint`
- When adding new countries, use the shared utilities in `cpi-shared.ts`
- Follow the established Lambda pattern: fetch → save raw → transform → save processed
- Update S3 key structure to follow: `cpi/{processed|raw}/{country-code}/SERIES_NAME.json`

## Adding New Countries

To add UK, EU, or other countries:

1. **Create API client** (e.g., `uk-ons-api.ts`) following existing patterns
2. **Create Lambda handler** using shared utilities from `cpi-shared.ts`:
   ```typescript
   const rawKeys = await saveRawCpiData(rawData, seriesIds, 'uk', 'UK ONS');
   const simplifiedData = transformMultiSeriesCpiData(rawData, seriesIds, 'UK ONS');
   const keys = await saveProcessedCpiData(simplifiedData, seriesIds, 'uk', 'UK ONS');
   ```
3. **Add Lambda function** to `template.yaml`
4. **Create test event** in `events/` directory
5. **Add npm script** for local testing

## Claude Code Guidelines

- Always present me a todo or implementation plan before proceeding. I would like to approve it first.
- When working with CPI data, use the shared utilities in `cpi-shared.ts` for consistency
- Maintain the established S3 key structure and data transformation patterns

## Quick CLI Tips

- You can use `sam list stack-outputs --output json | jq -r '.[] | select(.OutputKey == "CloudFrontDistributionDomainName") | .OutputValue'` to get the cloudfront domain. Using this you can download or view the exported CPI data