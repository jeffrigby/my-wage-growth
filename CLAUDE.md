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
npm run local-us-cpi-data # Test Lambda function locally with SAM

# SAM Commands (run from backend/)
sam build                 # Build the application
sam deploy --guided       # Deploy with interactive prompts
sam local invoke          # Test Lambda functions locally
```

## Architecture

- **Backend**: AWS Lambda functions using SAM for fetching CPI data from Bureau of Labor Statistics API
- **Frontend**: Planned React SPA to be hosted on S3/CloudFront
- **Data Storage**: S3 for processed CPI data and static files
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
├── lib/              # Shared utilities (AWS services, BLS API, logging)
└── test/             # Test files mirroring src structure
```

## Testing Strategy

- Unit tests for all major components using Vitest
- Mocking strategy for external dependencies (AWS SDK, BLS API)
- Real logger output preserved for debugging
- Test environment variables pre-configured

## Current State

- Backend Lambda function operational for fetching multiple CPI series
- S3 integration for data storage implemented
- CloudFront distribution configured
- Frontend development not yet started
- Infrastructure designed for future international expansion

## Development Guidelines

- Always run linting after modifying code. If changing the SAM template run `sam validate --lint`