# Real Wage Growth Calculator

A web application that helps you understand how your earnings growth compares to inflation over time, revealing whether your standard of living is truly improving. Track your wages across years and see your real purchasing power adjusted for inflation using official government CPI data.

## Why This Matters

Getting a 5% raise sounds great—until you realize inflation was 7%. Without adjusting for inflation, it's impossible to know if your standard of living is actually improving or declining. This calculator reveals the truth about your wage growth by:

- **Tracking Progress**: See if your earnings are beating inflation year over year
- **Comparing Offers**: Evaluate job offers in real purchasing power, not just nominal dollars
- **Negotiating Better**: Use data-driven insights to make your case for inflation-adjusted raises

## Features

### Current Features
- **Multi-Country Support**: Track wages in US (USD), Canada (CAD), or UK (GBP)
  - Switch countries while preserving entries (recalculates with new CPI data)
- **Flexible Entry Modes**: Enter annual salaries or individual paycheck amounts
  - Mode locking prevents mixing entry types
- **Inflation Adjustment**: Automatic CPI-based calculations showing real vs. nominal wages
  - Three-column metrics: Raise, Inflation, and Gain
  - Inflation rate calculation following BLS methodology
  - Column tooltips explaining each metric
- **Data Entry**:
  - Modal-based form with validation
  - CSV bulk import with drag-and-drop
  - Auto-detection of date formats (YYYY for annual, YYYY-MM-DD for paycheck)
  - Preview and validate before importing
- **Visual Analysis**:
  - Expandable row drawers for detailed actions
  - Color-coded growth indicators
  - Today's value column (inflation-adjusted)
  - See at a glance which years you gained or lost purchasing power
- **Help & Guidance**:
  - Pre-tax income help page with country-specific guidance
  - W-2 Box 3/5 (US), T4 Box 14 (Canada), P60 (UK)
  - Context-aware tooltips adapting to your settings
- **Official Data**: Powered by CPI data from:
  - 🇺🇸 U.S. Bureau of Labor Statistics
  - 🇨🇦 Statistics Canada
  - 🇬🇧 UK Office for National Statistics
- **Privacy First**: All calculations happen in your browser; your data never leaves your device
- **Dark Mode**: Editorial aesthetic with automatic theme detection
- **Accessibility**: Keyboard navigation, ARIA labels, Radix UI components

### Coming Soon
- Interactive charts with Recharts
- Statistics panel (best/worst years, cumulative impact)
- Share results via URL
- Export to CSV/PDF

## Tech Stack

### Frontend
- **React 19** - Modern UI with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Redux Toolkit 2.8** - Predictable state management with listener middleware
- **React Router 7** - Client-side routing with lazy loading
- **Tailwind CSS 4.1** - Editorial design system (Fraunces serif + DM Sans)
- **Radix UI** - Accessible tooltip components
- **Framer Motion** - Smooth animations and transitions
- **Recharts 3.1** - Data visualization charts
- **Vite 7** - Lightning-fast development and optimized production builds

### Backend (AWS Serverless)
- **AWS Lambda** - Serverless compute for CPI data fetching
- **Node.js 22** - Modern JavaScript runtime with ES modules
- **TypeScript** - Type-safe Lambda functions
- **AWS SAM** - Infrastructure as code and local testing
- **AWS Lambda Powertools** - Structured logging, tracing, and metrics
- **S3 + CloudFront** - Content delivery with edge caching
- **AWS AppConfig** - Centralized configuration management

### Testing & Quality
- **Vitest 4** - Fast unit testing with great TypeScript support
- **ESLint** - Code linting and style enforcement
- **Prettier** - Consistent code formatting

## Architecture

```
┌─────────────┐
│   Browser   │
│  (React UI) │
└──────┬──────┘
       │
       │ HTTPS
       ↓
┌─────────────────┐
│   CloudFront    │ ← Edge caching, CORS headers
└────────┬────────┘
         │
         ↓
    ┌────────┐
    │   S3   │
    └────┬───┘
         │
         ├─→ /static/*        (React app files)
         └─→ /cpi/processed/* (CPI JSON data)
              ↑
              │ Lambda writes
              │
    ┌─────────────────┐
    │ Lambda Functions│
    │   (Scheduled)   │
    └─────────────────┘
              ↑
              │ Fetch data
              │
    ┌──────────────────────┐
    │  CPI Data Sources    │
    │  • BLS API (US)      │
    │  • Stats Canada API  │
    │  • UK ONS API        │
    └──────────────────────┘
```

**How it works:**
1. Lambda functions run on a schedule to fetch latest CPI data from government APIs
2. Raw data is validated, transformed, and stored in S3 as JSON
3. CloudFront serves the React app and CPI data with edge caching
4. Browser fetches CPI data once and calculates inflation adjustments locally
5. All wage data stays in the browser's localStorage—never sent to any server

## Getting Started

### Prerequisites

- **Node.js** 18+ (22.x recommended)
- **npm** (project uses npm workspaces)
- **AWS CLI** configured with credentials (for backend deployment)
- **AWS SAM CLI** (for backend development)

### Installation

This project uses **npm workspaces** for monorepo management. Install from the root:

```bash
# From project root
npm install  # Installs all workspace dependencies

# Start frontend dev server
npm run dev  # or: npm run dev -w frontend

# Run backend tests
npm run unit -w backend
```

#### Frontend Development

```bash
# From root
npm run dev

# Or from frontend directory
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

#### Backend Development

```bash
# From root - install all dependencies
npm install
```

**Configure local environment:**

Create `backend/config/sandbox.json` with your AWS credentials and configuration:

```json
{
  "GetUSCPIDataFunction": {
    "WAGE_GROWTH_BUCKET": "your-bucket-name",
    "APPCONFIG_APP_ID": "your-appconfig-app-id",
    "APPCONFIG_ENV_ID": "your-appconfig-env-id",
    "APPCONFIG_PROFILE_ID": "your-appconfig-profile-id"
  }
}
```

**Test Lambda functions locally:**

```bash
# Test US CPI data fetching
npm run local-us-cpi-data

# Test Canadian CPI data fetching
npm run local-canadian-cpi-data

# Test UK CPI data fetching
npm run local-uk-cpi-data
```

## Development

### Frontend Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Type-check and build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Backend Commands

```bash
npm run unit          # Run unit tests once
npm run unit:watch    # Run tests in watch mode
npm run unit:ui       # Run tests with UI interface
npm run coverage      # Generate test coverage report
npm run lint          # Format and lint TypeScript code
npm run compile       # TypeScript compilation check
npm run test          # Compile + run all tests
npm run lint:sam      # Validate SAM template
```

### Project Structure

```
my-wage-growth/
├── package.json            # Root workspace configuration
├── package-lock.json       # Single lockfile for all workspaces
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── calculator/ # Wage entry components
│   │   │   │   ├── WageEntriesTable.tsx
│   │   │   │   ├── EditableTableRow.tsx
│   │   │   │   ├── WageEntryModal.tsx
│   │   │   │   ├── CSVImportModal.tsx
│   │   │   │   ├── CalculationDetails.tsx
│   │   │   │   └── TableSettings.tsx
│   │   │   ├── layout/     # App layout components
│   │   │   ├── providers/  # Context providers
│   │   │   └── ui/         # Reusable UI components (Radix UI wrappers)
│   │   ├── store/          # Redux store and slices
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Route components
│   │   │   ├── HomePage.tsx
│   │   │   └── PreTaxHelpPage.tsx
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   │   ├── inflationCalculator.ts
│   │   │   └── csvParser.ts
│   │   └── constants/      # App constants
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── handlers/       # Lambda function handlers
│   │   │   ├── get-us-cpi-data.ts
│   │   │   ├── get-canadian-cpi-data.ts
│   │   │   └── get-uk-cpi-data.ts
│   │   ├── lib/            # Shared utilities
│   │   │   ├── bls-api.ts  # US BLS API client
│   │   │   ├── stats-canada-api.ts
│   │   │   ├── uk-ons-api.ts
│   │   │   ├── cpi-shared.ts
│   │   │   └── aws.*.ts    # AWS service clients
│   │   └── test/           # Test files (Vitest 4)
│   ├── events/             # Sample Lambda events
│   ├── config/             # Local development config
│   ├── template.yaml       # SAM/CloudFormation template
│   └── package.json
│
├── CLAUDE.md               # AI agent guidance
└── README.md               # This file
```

## Deployment

### Backend Deployment (AWS)

The backend uses AWS SAM for infrastructure as code.

**First-time setup:**

```bash
cd backend
sam build
sam deploy --guided
```

This will prompt you for:
- Stack name
- AWS Region
- Allowed origins for CORS (your frontend domain)
- Confirmation before deployment

**Configuration after deployment:**

1. **Add BLS API Key to AppConfig** (for US CPI data):
   - Get a free API key from [BLS Developer Portal](https://data.bls.gov/registrationEngine/)
   - Store the key in AWS AppConfig configuration profile

2. **Schedule Lambda Functions**:
   - Set up EventBridge rules to run Lambda functions periodically (e.g., daily or weekly)
   - This keeps CPI data up to date

3. **Note CloudFront Domain**:
   - After deployment, get the CloudFront distribution domain from stack outputs
   - Use this domain for the frontend's `VITE_CPI_DOMAIN` environment variable

**Subsequent deployments:**

```bash
sam build && sam deploy
```

### Frontend Deployment

**Build for production:**

```bash
cd frontend
npm run build
```

**Deploy to S3 + CloudFront:**

```bash
# Upload build files to S3
aws s3 sync dist/ s3://your-bucket-name/static/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/static/*"
```

**Environment Variables:**

Create `.env.production`:

```env
VITE_CPI_DOMAIN=your-cloudfront-domain.cloudfront.net
```

## Configuration

### Frontend Environment Variables

- `VITE_CPI_DOMAIN` - CloudFront domain for fetching CPI data

### Backend Environment Variables

Set via AWS SAM template or AppConfig:

- `WAGE_GROWTH_BUCKET` - S3 bucket for storing CPI data
- `APPCONFIG_APP_ID` - AppConfig application ID
- `APPCONFIG_ENV_ID` - AppConfig environment ID
- `APPCONFIG_PROFILE_ID` - AppConfig profile ID
- `LOG_LEVEL` - Logging verbosity (INFO, DEBUG, ERROR)
- `POWERTOOLS_SERVICE_NAME` - Service name for AWS Lambda Powertools
- `POWERTOOLS_METRICS_NAMESPACE` - CloudWatch metrics namespace

### AppConfig Configuration

Store sensitive configuration in AWS AppConfig:

```json
{
  "blsApiKey": "your-bls-api-key-here"
}
```

## Data Sources

This application uses official government CPI data:

- **United States**: [Bureau of Labor Statistics](https://www.bls.gov/cpi/) - CPI for All Urban Consumers (CPI-U)
- **Canada**: [Statistics Canada](https://www.statcan.gc.ca/) - Consumer Price Index (CPI)
- **United Kingdom**: [Office for National Statistics](https://www.ons.gov.uk/) - Consumer Prices Index (CPI)

Data is fetched and updated automatically by scheduled Lambda functions and cached for fast access.

## Testing

### Running Tests

**Backend:**
```bash
cd backend
npm run unit          # Run once
npm run unit:watch    # Watch mode
npm run coverage      # With coverage
```

**Frontend:**
```bash
cd frontend
npm test             # Tests (when implemented)
```

### Test Coverage

The backend includes comprehensive unit tests for:
- Lambda function handlers
- API clients (BLS, Stats Canada, UK ONS)
- Data transformation utilities
- AWS service integrations

Target coverage: 80%+ for critical paths

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue with detailed reproduction steps
2. **Suggest Features**: Share your ideas for new functionality
3. **Improve Documentation**: Help make the docs clearer
4. **Submit PRs**: Fix bugs or implement features

### Development Guidelines

- Follow the existing code style (enforced by ESLint/Prettier)
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages
- Test locally before submitting PR

## License

MIT License - See LICENSE file for details

## Acknowledgments

- CPI data provided by US Bureau of Labor Statistics, Statistics Canada, and UK Office for National Statistics
- Built with modern web technologies and AWS serverless architecture
- Inspired by the need for financial transparency and informed career decisions

## Support

If you find this tool useful, consider:
- Starring the repository
- Reporting bugs and issues
- Suggesting new features
- Improving documentation
- Sharing with others who might benefit

---

**Note**: This tool provides estimates based on official CPI data. Actual purchasing power changes may vary based on individual spending patterns and regional differences. Always consult with financial professionals for personalized advice.
