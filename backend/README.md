# Real Wage Growth Calculator - Backend

This is the serverless backend for the Real Wage Growth Calculator application, built with AWS SAM (Serverless Application Model). It fetches and processes Consumer Price Index (CPI) data from multiple national statistics agencies.

## Overview

The backend provides Lambda functions to fetch CPI data from:
- 🇺🇸 US Bureau of Labor Statistics (BLS)
- 🇨🇦 Statistics Canada
- 🇬🇧 UK Office for National Statistics (ONS)

Data is stored in S3 and served through CloudFront for the frontend application.

## Architecture

### Lambda Functions

1. **GetUSCPIDataFunction** - Fetches US CPI data from BLS API
   - Retrieves 11 different CPI series (ALL, FOOD, HOUSING, etc.)
   - Requires API key authentication
   - Handles rate limiting and retries

2. **GetCanadianCPIDataFunction** - Fetches Canadian CPI data
   - Retrieves 10 series from Statistics Canada Web Data Service
   - No authentication required
   - Processes CSV data

3. **GetUKCPIDataFunction** - Fetches UK CPI data from ONS
   - Retrieves 12 CPIH series
   - Processes Excel files with streaming
   - Handles complex data transformations

### Infrastructure Components

- **S3 Bucket** (`WageGrowthBucket`)
  - Versioning enabled
  - Lifecycle policies for cost optimization
  - Organized structure for raw and processed data
- **CloudFront Distribution**
  - Caches and serves CPI data
  - CORS configuration
  - Custom response headers
- **AppConfig** - Centralized configuration management
- **Application Insights** - Monitoring and observability

### Data Structure

```
s3://bucket/
├── cpi/
│   ├── processed/     # Frontend-ready JSON data
│   │   ├── us/        # CPI_U_ALL.json, CPI_U_FOOD.json, etc.
│   │   ├── ca/        # CPI_CA_ALL.json, CPI_CA_FOOD.json, etc.
│   │   └── uk/        # CPI_UK_ALL.json, CPI_UK_FOOD.json, etc.
│   └── raw/          # Raw API responses for debugging
│       ├── us/
│       ├── ca/
│       └── uk/
└── static/           # Frontend files (future)
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed
- Node.js 20.x runtime
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the application
sam build
```

## Local Development

Test Lambda functions locally:

```bash
# Test US CPI function
npm run local-us-cpi-data

# Test Canadian CPI function  
npm run local-canadian-cpi-data

# Test UK CPI function
npm run local-uk-cpi-data
```

## Testing

We use Vitest for testing with comprehensive coverage:

```bash
# Run unit tests
npm run unit

# Run tests in watch mode
npm run unit:watch

# Run tests with UI
npm run unit:ui

# Generate coverage report
npm run coverage

# Lint and compile check
npm run lint
npm run compile
```

## Deployment

```bash
# Validate SAM template
sam validate --lint

# Deploy with guided prompts
sam deploy --guided

# Deploy with specific parameters
sam deploy \
  --stack-name wage-growth-backend-prod \
  --parameter-overrides AllowedOrigins="https://yourdomain.com,https://www.yourdomain.com"
```

### Deployment Parameters

- `AllowedOrigins` - CORS allowed origins (default: "*")
  - Use comma-separated list for production
  - Example: "https://app.example.com,https://example.com"

## Environment Variables

Lambda functions use these environment variables:

- `WAGE_GROWTH_BUCKET` - S3 bucket name
- `APPCONFIG_APP_ID` - AppConfig application ID
- `APPCONFIG_ENV_ID` - AppConfig environment ID  
- `APPCONFIG_PROFILE_ID` - AppConfig profile ID
- `POWERTOOLS_SERVICE_NAME` - Service name for logging
- `POWERTOOLS_METRICS_NAMESPACE` - CloudWatch metrics namespace
- `LOG_LEVEL` - Logging level (default: INFO)

## Development Scripts

```json
{
  "test": "npm run compile && npm run unit",
  "compile": "tsc",
  "unit": "vitest run",
  "unit:watch": "vitest",
  "unit:ui": "vitest --ui",
  "coverage": "vitest run --coverage",
  "lint": "prettier --write . && eslint . --ext .ts --fix",
  "lint:sam": "sam validate --lint",
  "local-us-cpi-data": "sam local invoke GetUSCPIDataFunction",
  "local-canadian-cpi-data": "sam local invoke GetCanadianCPIDataFunction",
  "local-uk-cpi-data": "sam local invoke GetUKCPIDataFunction"
}
```

## Key Dependencies

- **AWS Lambda Powertools** - Structured logging, tracing, metrics
- **AWS SDK v3** - S3, AppConfig clients
- **Middy** - Lambda middleware
- **Zod** - Runtime validation
- **csv-parse** - CSV processing
- **p-limit/p-retry** - Rate limiting and retries
- **unzipper** - Compressed data handling

## API Integrations

### US Bureau of Labor Statistics
- Rate limited: 500 requests/day
- Requires API key
- Series IDs configured in AppConfig

### Statistics Canada
- No authentication required
- CSV format responses
- Web Data Service API

### UK Office for National Statistics
- Excel file downloads
- Complex data transformation
- Monthly and annual data

## Shared Utilities

The `cpi-shared.ts` module provides common functionality:
- Data transformation functions
- S3 storage helpers
- Validation utilities
- Common interfaces

## Monitoring

- AWS X-Ray tracing enabled
- CloudWatch Logs with structured logging
- Application Insights integration
- Custom CloudWatch metrics

## CORS Configuration

CORS is configured at multiple levels:
1. S3 bucket CORS rules
2. CloudFront response headers
3. Lambda function responses

Configure allowed origins via the `AllowedOrigins` parameter during deployment.

## Additional Documentation

- [Testing Guide](./TESTING.md)
- [Canadian CPI Implementation](./docs/canadian-cpi-implementation-plan.md)
- [Canadian CPI POC Results](./docs/canadian-cpi-poc-results.md)

## License

This project is licensed under the MIT License.