# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Real Wage Growth Calculator application that helps users understand how their earnings growth compares to inflation over time. The architecture uses AWS serverless services with a SAM-based backend and a React frontend.

## Monorepo Structure

This project uses **npm workspaces** to manage the monorepo:

- **Root**: Contains workspace configuration and shared dependencies
- **backend/**: AWS SAM backend application (my-wage-growth-backend)
- **frontend/**: React frontend application (my-wage-growth-fe)

### Workspace Benefits
- Single `npm install` at root installs all dependencies
- Shared dependencies hoisted to root (reduces duplication)
- Consistent dependency versions across packages
- Simplified dependency management

### Workspace Commands

Run commands from the **root directory** using the `-w` flag:

```bash
# Installation (from root)
npm install                    # Install all workspace dependencies

# Run commands in specific workspaces
npm run dev -w frontend        # Start frontend dev server
npm run unit -w backend        # Run backend unit tests
npm run lint -w backend        # Lint backend code
npm run build -w frontend      # Build frontend

# Run commands across all workspaces
npm run lint                   # Lint all workspaces
npm run test                   # Test all workspaces
npm run build                  # Build all workspaces

# Convenience scripts (from root)
npm run dev                    # Alias for frontend dev server
npm run unit                   # Alias for backend unit tests
npm run backend:test           # Run backend tests
npm run frontend:build         # Build frontend
```

You can also run workspace commands from within their directories:
```bash
cd backend && npm run unit     # Same as: npm run unit -w backend
cd frontend && npm run dev     # Same as: npm run dev -w frontend
```

## Development Commands

**Note**: Commands below can be run from within each workspace directory (cd backend/ or cd frontend/) or from the root using `-w workspace-name`. See "Workspace Commands" section above.

### Backend Development
```bash
# Testing (from backend/ or root with -w backend)
npm run unit              # Run unit tests once
npm run unit:watch        # Run tests in watch mode
npm run unit:ui           # Run tests with UI interface
npm run coverage          # Generate coverage report

# Code Quality (from backend/ or root with -w backend)
npm run lint              # Format and lint code
npm run compile           # TypeScript compilation check
npm run test              # Compile + run all tests
npm run lint:sam          # Validate SAM template

# Local Development (from backend/ or root with -w backend)
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
# Development (from frontend/ or root with -w frontend)
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
  - Editorial/data-journalism aesthetic (Fraunces serif headlines, DM Sans body)
  - Deep navy primary color (#1E3A5F light, #5B8BD4 dark)
  - Tailwind CSS 4.1 with warm, subtle design
  - Framer Motion animations
  - Dark mode support
  - Responsive design with SVG icons
- **Data Visualization**: Recharts 3.1
- **UI Components**: Radix UI Tooltip for accessible tooltips

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
- **State Management**: Redux Toolkit with typed hooks (`useAppDispatch`, `useAppSelector`)
- **Styling**: Tailwind CSS with editorial design system (warm tones, subtle shadows)
- **Error Handling**: Toast notifications with react-hot-toast
- **Data Persistence**: LocalStorage via Redux listener middleware
- **Type Safety**: Strict TypeScript with comprehensive interfaces
- **Accessibility**: Radix UI primitives for tooltips, keyboard navigation, ARIA labels
- **Table UX**: Expandable row drawers instead of action columns (click-to-expand with keyboard support)
- **Terminology**: "Gross Pay" (not "Amount"), "Change" (not "Raise"), "Gain/Loss" and "Real Gain/Loss" columns

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
│   │   ├── WageEntriesTable.tsx    # Main table with entry management
│   │   ├── EditableTableRow.tsx    # Expandable row with action drawer
│   │   ├── WageEntryModal.tsx      # Add/edit entry modal
│   │   ├── CSVImportModal.tsx      # Bulk CSV import with validation
│   │   ├── CalculationDetails.tsx  # Shows inflation calculation formulas
│   │   └── TableSettings.tsx       # CPI calculation type settings
│   ├── layout/       # App structure components
│   ├── providers/    # Context providers
│   └── ui/          # Reusable UI components
│       ├── Tooltip.tsx              # Radix UI tooltip wrapper
│       ├── Modal.tsx                # Base modal component
│       ├── ConfirmDialog.tsx        # Confirmation dialog
│       ├── CountryDropdown.tsx      # Country selector
│       ├── ThemeToggle.tsx          # Dark mode toggle
│       └── CPILoadingOverlay.tsx    # CPI data loading state
├── hooks/           # Custom React hooks
├── routes/          # Route components
├── pages/           # Full page components
│   ├── HomePage.tsx
│   └── PreTaxHelpPage.tsx          # Help page for finding gross income
├── store/           # Redux store and slices
├── types/           # TypeScript definitions
├── utils/           # Utility functions
│   ├── inflationCalculator.ts      # CPI calculations and formatting
│   └── csvParser.ts                # CSV parsing with validation
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
- **Entry Components (Phase 3)**: ✅ Complete
  - ✅ Wage entry form with validation
  - ✅ Modal-based entry editing
  - ✅ Table with expandable row drawers
  - ✅ Three-column inflation metrics (Raise, Inflation, Gain)
  - ✅ Column header tooltips explaining metrics
  - ✅ CSV bulk import with drag-and-drop
  - ✅ Entry mode locking
  - ✅ Clear all with confirmation
  - ✅ Toast notifications
  - ✅ Calculation details modal with formulas
  - ✅ Pre-tax help page with country-specific guidance
  - ✅ Country switching preserves entries (recalculates with new CPI)
- **Visualization (Phase 4)**: ⏳ Not started - Charts and statistics
- **Sharing (Phase 5)**: ⏳ Not started - URL sharing, export features

## Recent Updates

### Infrastructure
1. **npm Workspaces**: Converted monorepo to use npm workspaces
   - Single root `package.json` with workspace configuration
   - Shared dependencies hoisted to root `node_modules`
   - Single `package-lock.json` at root for consistent versioning
   - Convenience scripts for cross-workspace commands

### Backend
1. **AppConfig IAM Permissions** (commit 951ab1d):
   - Added StartConfigurationSession and GetLatestConfiguration actions
   - Fixed authorization errors when Lambda functions access AppConfig
   - Applied to all three CPI data functions (US, Canadian, UK)

2. **Vitest v4 Upgrade** (commit bc94366):
   - Upgraded from Vitest v2 to v4
   - Fixed handler tests to work with new version
   - Updated test configuration

3. **CORS Configuration**: Added `AllowedOrigins` parameter for production deployments
4. **S3 CORS Rules**: Configured bucket CORS for frontend access
5. **CloudFront Headers**: Custom response headers policy for CORS

### Frontend
1. **Editorial Redesign** (commit 71d56ed):
   - Replaced cyberpunk/neon design with clean data-journalism aesthetic
   - Typography: Fraunces serif headlines, DM Sans body text
   - Color: Deep navy primary (#1E3A5F light, #5B8BD4 dark)
   - Custom SVG icons replacing Font Awesome where appropriate
   - Minimal, functional UI with stripped excessive copy

2. **Table UX Improvements**:
   - **Expandable Row Drawers** (commit 710451c): Click row to reveal action buttons (Details, Edit, Delete)
   - **Three-Column Metrics** (commit b7e2397): Split into Raise, Inflation, and Gain columns
   - **Column Tooltips** (commit b7e2397): Radix UI tooltips explaining each metric
   - **Terminology Updates** (commit c896d07): "Gross Pay" instead of "Amount", "Change" instead of "Raise"
   - **Gain/Loss Labels** (commit ef7cf78): Parallel terminology for nominal and real changes
   - Today's value column (inflation-adjusted)
   - Color-coded growth indicators
   - Keyboard accessibility (Enter/Space to toggle, Escape to close)
   - CPI data date range display in table footer

3. **CSV Bulk Import** (commit c71e866):
   - CSVImportModal component with drag-and-drop upload
   - Auto-detection of annual (YYYY) vs paycheck (YYYY-MM-DD) formats
   - Preview table with validation before import
   - Template generation for easy setup
   - csvParser utility with comprehensive validation

4. **Country Switching** (commit 996073f):
   - Preserves wage entries when switching countries
   - Recalculates inflation using new country's CPI data
   - Updates currency symbols automatically

5. **Pre-Tax Help** (commit a35c795):
   - New /help/pre-tax page with country-specific guidance
   - W-2 Box 3/5 for US, T4 Box 14 for Canada, P60 for UK
   - Enhanced modal help text that adapts to country and entry mode

6. **Entry Mode Locking**: Prevents mixing annual and paycheck entries

7. **Form Improvements**:
   - Fixed amount input validation (step="0.01")
   - Allow future dates with CPI fallback
   - Fixed date display timezone issues

8. **UI Components**:
   - Tooltip (Radix UI wrapper for accessible tooltips)
   - ConfirmDialog for destructive actions
   - CPILoadingOverlay for data fetching
   - Toast notifications with react-hot-toast

9. **Inflation Calculator**: Comprehensive utility module with:
   - getCPIForDate() with interpolation
   - adjustToLatestCPI() for current dollar calculations
   - calculatePercentageChange() for growth tracking
   - calculateInflationRate() following BLS methodology
   - Formatting utilities with color coding

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
- **Workspace setup**: Run `npm install` from root to install all dependencies
- **Running commands**: Use `-w workspace-name` from root or cd into workspace directory
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

## Design Guidelines

### Editorial Aesthetic
The frontend uses a clean, data-journalism inspired design:
- **Typography**: Fraunces for headlines (serif, editorial), DM Sans for body (clean, readable)
- **Color Palette**: Deep navy primary, warm accent colors, subtle borders
- **Visual Style**: Minimal decoration, functional UI, let data be the hero
- **Icons**: Custom SVG icons for key actions (prefer over icon fonts)
- **Spacing**: Generous whitespace, clear visual hierarchy
- **Terminology**: Clear, professional language (e.g., "Gross Pay" not "Amount")

### UX Patterns
- **Tables**: Expandable row drawers instead of dedicated action columns (saves space)
- **Tooltips**: Use Radix UI tooltips for explanatory content (accessible, well-positioned)
- **Modals**: Full-featured modal editing (no inline quick-edit to reduce complexity)
- **Terminology**: Use parallel language (Gain/Loss, Real Gain/Loss) for clarity
- **Help**: Context-aware help that adapts to country and entry mode

## Claude Code Guidelines

### Workflow
- For non-trivial implementation tasks, use **plan mode** to design and get approval before coding
- Before a major refactor, ask if I would like to commit uncommitted changes first
- Never auto-commit to git; only commit when explicitly asked
- Run the app locally to test changes when possible

### Code Style
- When working with CPI data, use the shared utilities for consistency
- When adding tooltips, use the Radix UI Tooltip component (already installed)
- Follow the editorial design aesthetic: minimal, functional, data-focused
- Use proper terminology: "Gross Pay" (not "Amount"), "Gain/Loss" and "Real Gain/Loss" for change columns
- Check official docs with web search to ensure you're following modern best practices

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