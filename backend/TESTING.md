# Testing Guide

This document describes the testing setup and practices for the backend application.

## Overview

The backend uses [Vitest](https://vitest.dev/) as the testing framework, which provides:
- Fast test execution with native TypeScript support
- Built-in mocking capabilities
- Code coverage reporting
- Watch mode for development

## Test Structure

Tests are organized in the `src/test/` directory, mirroring the source code structure:

```
src/test/
├── lib/
│   ├── utils.test.ts
│   ├── bls-api.test.ts
│   └── logger.test.ts
└── handlers/
    └── get-us-cpi-data.test.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm run unit

# Run tests in watch mode (re-runs on file changes)
npm run unit:watch

# Run tests with UI interface
npm run unit:ui

# Run tests with coverage report
npm run coverage

# Run linting and tests together
npm test
```

### Environment Variables

Tests automatically use the following environment variables (configured in `vitest.config.ts`):
- `APPCONFIG_APP_ID=test-app-id`
- `APPCONFIG_ENV_ID=test-env-id`
- `WAGE_GROWTH_BUCKET=test-bucket`
- `AWS_REGION=us-east-1`

## Test Categories

### Unit Tests

#### Utils Tests (`src/test/lib/utils.test.ts`)
Tests the utility functions, particularly the `checkEnvVar` function:
- Environment variable validation
- Default value handling
- Error conditions

#### BLS API Tests (`src/test/lib/bls-api.test.ts`)
Tests the Bureau of Labor Statistics API integration:
- Enum validation for CPI series IDs
- Data structure validation
- Mock response helpers

#### Logger Tests (`src/test/lib/logger.test.ts`)
Tests the logging functionality:
- Logger instance creation
- Singleton pattern validation
- Actual logging capability (not mocked for better debugging)

#### Handler Tests (`src/test/handlers/get-us-cpi-data.test.ts`)
Tests the Lambda handler logic:
- Data transformation functions
- Date formatting utilities
- CPI data structure validation
- Error handling scenarios

## Mocking Strategy

The tests use Vitest's built-in mocking capabilities:

### External Dependencies
- AWS SDK clients are mocked to avoid actual AWS calls
- BLS API calls are mocked to prevent external HTTP requests
- **Logger is NOT mocked** - actual log messages are visible for better debugging

### Example Mock Setup
```typescript
vi.mock('@/lib/aws.appconfig', () => ({
  getWageGrowthConfig: vi.fn(),
}));

vi.mock('@/lib/bls-api', () => ({
  fetchMultipleCpiData: vi.fn(),
  CpiSeriesId: {
    CPI_U_ALL: 'CUUR0000SA0',
    CPI_U_FOOD: 'CUUR0000SAF',
  },
}));

// Note: Logger is intentionally NOT mocked to preserve log output for debugging
```

## Coverage Reporting

Coverage reports are generated using V8 and include:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

Coverage reports are available in multiple formats:
- Text output in terminal
- JSON format for CI/CD integration
- HTML report for detailed analysis

## Path Aliases

Tests use the same path aliases as the main application:
- `@/` → `./src/`
- `@/lib` → `./src/lib/`
- `@/handlers` → `./src/handlers/`

## Best Practices

### Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern

### Mocking
- Mock external dependencies to ensure tests are isolated
- Use type-safe mocks when possible
- Clear mocks between tests using `beforeEach`
- **Don't mock loggers** - preserve log output for debugging

### Environment Setup
- Set up required environment variables in test configuration
- Use `beforeAll` for one-time setup
- Use `beforeEach` for per-test setup

### Data Validation
- Test both success and error scenarios
- Validate data structures and transformations
- Test edge cases and boundary conditions

### Debugging
- Logger output is preserved during tests for easier troubleshooting
- Use `console.log` or logger statements in tests to debug issues
- Review log messages in test output to understand execution flow

## Configuration

The test configuration is defined in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      // Test environment variables
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
  },
  resolve: {
    alias: {
      // Path aliases for imports
    },
  },
});
```

## Continuous Integration

Tests are designed to run in CI/CD environments:
- No external dependencies required
- Environment variables are self-contained
- Coverage reports can be exported for analysis
- Fast execution suitable for automated pipelines
- Log output is preserved for debugging failed builds

## Adding New Tests

When adding new functionality:

1. Create corresponding test files in the `src/test/` directory
2. Follow the existing naming convention (`*.test.ts`)
3. Mock external dependencies appropriately (but not loggers)
4. Include both positive and negative test cases
5. Update this documentation if new patterns are introduced

## Troubleshooting

### Common Issues

**Import Resolution Errors**
- Ensure path aliases are correctly configured in `vitest.config.ts`
- Check that the file structure matches the import paths

**Mock Not Working**
- Verify mocks are defined before imports
- Use `vi.clearAllMocks()` in `beforeEach` to reset state

**Environment Variable Issues**
- Check that required variables are defined in the test configuration
- Use `process.env` directly in tests when needed

**Debugging Test Failures**
- Review log messages in test output - they are preserved for debugging
- Add temporary `console.log` statements in tests to trace execution
- Use logger statements to understand test flow

### Debug Mode

To debug tests:
```bash
# Run specific test file
npx vitest run src/test/lib/utils.test.ts

# Run with verbose output
npx vitest run --reporter=verbose

# Run in debug mode
npx vitest run --inspect-brk
``` 