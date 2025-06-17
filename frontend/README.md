# Real Wage Growth Calculator - Frontend

A modern web application that helps users visualize their wage growth compared to inflation over time. Built with React 19, TypeScript, and Redux Toolkit.

## Overview

This application allows users to:
- 📊 Track wage changes over time
- 💰 Compare nominal vs real (inflation-adjusted) wages
- 🌍 Support for US, Canada, and UK data
- 📈 Visualize purchasing power with interactive charts
- 🔗 Share results via URL

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.3
- **State Management**: Redux Toolkit 2.8 with listener middleware
- **Routing**: React Router 7
- **Styling**: Tailwind CSS 4.1 with glass-morphism design
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Icons**: Font Awesome
- **Notifications**: react-hot-toast

## Features

### Core Functionality
- **Multi-country Support**: US 🇺🇸, Canada 🇨🇦, UK 🇬🇧
- **Entry Modes**: Annual salary or specific paycheck dates
- **Real-time Calculations**: Inflation adjustments using official CPI data
- **Smart Validations**: Date range checking against available CPI data
- **Sample Data**: Pre-populated examples for each country

### User Experience
- **Dark Mode**: System preference detection with manual toggle
- **Responsive Design**: Mobile-optimized with progressive disclosure
- **Toast Notifications**: Success/error feedback
- **Smooth Animations**: Framer Motion transitions
- **Glass-morphism UI**: Modern blur effects and transparency

### Data Management
- **Entry Mode Locking**: Prevents mixing annual and paycheck entries
- **LocalStorage Persistence**: Saves entries and preferences
- **Table Features**:
  - Inline editing
  - Today's value (inflation-adjusted)
  - Percentage changes (nominal & real)
  - Color-coded growth indicators
  - Clear all with confirmation

## Project Structure

```
src/
├── components/
│   ├── calculator/         # Wage entry components
│   │   ├── WageEntriesTable.tsx
│   │   ├── EditableTableRow.tsx
│   │   └── WageEntryModal.tsx
│   ├── layout/            # App structure
│   │   ├── MainLayout.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── providers/         # Context providers
│   │   ├── ThemeProvider.tsx
│   │   └── CPIDataProvider.tsx
│   └── ui/               # Reusable UI components
│       ├── ConfirmDialog.tsx
│       ├── CountryDropdown.tsx
│       ├── CPILoadingOverlay.tsx
│       ├── Modal.tsx
│       └── ThemeToggle.tsx
├── hooks/                # Custom React hooks
│   └── useCPIData.ts
├── routes/              # Route components
│   └── home.tsx
├── store/               # Redux store
│   ├── index.ts        # Store configuration
│   └── slices/
│       ├── cpiSlice.ts
│       ├── wageEntriesSlice.ts
│       └── uiSlice.ts
├── types/              # TypeScript definitions
├── utils/              # Utility functions
│   ├── inflationCalculator.ts
│   └── clearLocalStorage.ts
└── constants/          # App constants
```

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file:

```env
VITE_CPI_DOMAIN=your-cloudfront-domain.cloudfront.net
```

## Development

### Available Scripts

```json
{
  "dev": "vite",                    # Start dev server
  "build": "tsc -b && vite build",  # Type-check and build
  "lint": "eslint .",               # Run linter
  "preview": "vite preview"         # Preview production build
}
```

### Redux Store

The app uses Redux Toolkit with three slices:

1. **cpiSlice** - CPI data fetching and caching
   - Async thunks for API calls
   - Date range calculations
   - Multi-country support

2. **wageEntriesSlice** - Wage entry CRUD operations
   - Entry mode management
   - Country/currency switching
   - Sample data loading

3. **uiSlice** - UI state management
   - Theme preferences
   - Modal controls
   - Loading states

### Key Components

#### WageEntriesTable
Main table component with:
- Sortable entries by date
- Inline editing capabilities
- Inflation-adjusted calculations
- Percentage change tracking
- Clear all functionality

#### WageEntryModal
Form for adding/editing entries:
- Entry mode selector (locked when entries exist)
- Date validation against CPI availability
- Pre-tax wage guidance
- Currency formatting

#### InflationCalculator Utilities
- `getCPIForDate()` - CPI value retrieval with interpolation
- `adjustToLatestCPI()` - Current dollar calculations
- `calculatePercentageChange()` - Growth calculations
- `formatPercentage()` - Display formatting

## Implementation Status

Based on [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md):

- ✅ **Phase 1**: Foundation (Complete)
- ✅ **Phase 2**: Data Layer (Complete)
- ⚪ **Phase 3**: Entry Components (In Progress)
  - Most features complete
  - Mobile responsive design needed
- ⚫ **Phase 4**: Calculations & Visualization (Not Started)
- ⚫ **Phase 5**: Sharing & Polish (Not Started)

## Design System

### Colors
```css
--primary: #4f46e5;        /* Indigo */
--accent: #10b981;         /* Emerald */
--background: #ffffff;     /* Light mode */
--background-dark: #0f172a; /* Dark mode */
```

### Glass-morphism
```css
backdrop-filter: blur(10px);
background: rgba(255, 255, 255, 0.8);
border: 1px solid rgba(255, 255, 255, 0.18);
```

## Future Enhancements

- Chart visualization with Recharts
- URL sharing with pako compression
- CSV import/export
- PDF report generation
- Additional countries (EU, Australia)
- Advanced statistics panel

## Contributing

1. Follow existing code patterns
2. Maintain TypeScript strict mode
3. Add appropriate error handling
4. Include toast notifications for user actions
5. Ensure mobile responsiveness

## License

This project is licensed under the MIT License.