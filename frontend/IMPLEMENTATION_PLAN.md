# Real Wage Growth Calculator - Frontend Implementation Plan

## Overview
A responsive web application that helps users visualize their wage growth compared to inflation over time. Users enter their historical wages, and the app shows them their real purchasing power adjusted for inflation using CPI data.

## Design Philosophy
- **Modern & Slick**: Clean, minimalist interface with smooth animations and micro-interactions
- **Glass-morphism**: Subtle blur effects and transparency for depth
- **Smooth Transitions**: Framer Motion for delightful animations
- **Professional Color Palette**: Sophisticated gradients and accent colors
- **Typography**: Modern font stack with clear hierarchy
- **Best Practices**: Following latest patterns from Redux Toolkit v2.8, React Router v7, and React 19

## Technical Stack
- **Framework**: React 19 with TypeScript
- **Bundler**: Vite 6.3
- **Routing**: React Router v7
- **State Management**: Redux Toolkit v2.8 with listener middleware
- **Styling**: Tailwind CSS v4.1 with dark mode support
- **Icons**: Font Awesome ✅
- **Charts**: Recharts ✅
- **Date handling**: date-fns ✅
- **Compression**: pako ✅ (for URL sharing)
- **Animations**: Framer Motion ✅
- **Notifications**: react-hot-toast ✅

## Core Features
1. Multi-country support (US, UK, Canada) with currency selection
2. Two wage entry modes: Annual (year only) vs Paycheck (specific date)
3. Real-time inflation adjustment calculations
4. Interactive chart visualization
5. Shareable results via URL (compressed/encoded data)
6. Light/dark mode with system preference detection
7. Sample data for first-time users
8. Educational content about inflation

## Application Structure

### Routes (React Router v7)
```typescript
// routes.tsx
import { RouteConfig } from '@react-router/dev/routes';

export default [
  {
    path: '/',
    lazy: () => import('./routes/home'),
  },
  {
    path: 'about',
    lazy: () => import('./routes/about'),
  },
  {
    path: 'shared/:encodedData',
    lazy: () => import('./routes/shared'),
  }
] satisfies RouteConfig[];
```

### Redux Store Structure
```typescript
{
  cpiData: {
    us: CPIData | null,
    ca: CPIData | null,
    uk: CPIData | null,
    loading: boolean,
    error: string | null,
    lastFetch: string | null
  },
  wageEntries: {
    entries: WageEntry[],
    country: 'US' | 'CA' | 'UK',
    currency: 'USD' | 'CAD' | 'GBP',
    entryMode: 'annual' | 'paycheck'
  },
  ui: {
    theme: 'light' | 'dark' | 'system',
    showIntro: boolean,
    sampleDataLoaded: boolean
  }
}
```

### Component Hierarchy
```
App
├── ThemeProvider (handles light/dark mode)
├── Header
│   ├── Logo
│   ├── Navigation
│   ├── ThemeToggle
│   └── ShareButton (conditionally shown)
├── Routes
│   ├── MainPage
│   │   ├── IntroSection (first-time users)
│   │   ├── CountrySelector
│   │   ├── CurrencyDisplay
│   │   ├── EntryModeSelector (annual vs paycheck)
│   │   ├── WageEntryForm
│   │   │   ├── DateInput (year or full date based on mode)
│   │   │   ├── AmountInput (with pre-tax info)
│   │   │   └── AddButton
│   │   ├── WageEntriesTable
│   │   │   └── WageEntryRow (editable/deletable)
│   │   ├── ResultsSection (shown when 2+ entries)
│   │   │   ├── WageGrowthChart
│   │   │   ├── StatisticsPanel
│   │   │   └── ShareButton
│   │   └── SampleDataPrompt
│   ├── AboutPage
│   │   ├── WhatIsInflation
│   │   ├── HowCPIWorks
│   │   └── WhyPreTaxMatters
│   └── SharedResultsPage
│       ├── ReadOnlyChart
│       ├── ReadOnlyStats
│       └── CreateYourOwnCTA
└── Footer
```

## Implementation Phases

### Phase 1: Foundation (Days 1-2) ✅ COMPLETED
1. **Project Setup** ✅
   - ✅ Installed dependencies (removed redux-persist, using modern RTK persistence)
   - ✅ Configured Tailwind v4.1 with dark mode and custom design system
   - ✅ Set up Redux Toolkit with createListenerMiddleware for persistence
   - ✅ Created comprehensive TypeScript interfaces and constants
   - ✅ Implemented theme provider with system detection

2. **Core Layout** ✅
   - ✅ Header with navigation and theme toggle
   - ✅ Footer with data attribution and CPI source info
   - ✅ Responsive container components with glass-morphism design
   - ✅ Modern theme toggle with Font Awesome icons
   - ✅ Basic routing structure with React Router v7

### Phase 2: Data Layer (Days 3-4) ✅ COMPLETED
1. **Modern Redux Setup (following RTK v2.8 patterns)** ✅
   - ✅ Redux store configured with typed hooks
   - ✅ CPI data slice with async thunks
   - ✅ Wage entries slice with full CRUD operations
   - ✅ UI slice for theme and modal management
   - ✅ LocalStorage persistence with listener middleware
   ```typescript
   // store/index.ts
   import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
   import { useDispatch, useSelector } from 'react-redux';
   import { cpiSlice } from './slices/cpiSlice';
   import { wageEntriesSlice } from './slices/wageEntriesSlice';
   import { uiSlice } from './slices/uiSlice';
   
   // Load initial state from localStorage
   const loadState = () => {
     try {
       const serializedState = localStorage.getItem('wage-growth-state');
       return serializedState ? JSON.parse(serializedState) : undefined;
     } catch (err) {
       console.warn('Failed to load state from localStorage:', err);
       return undefined;
     }
   };
   
   // Save state to localStorage
   const saveState = (state: RootState) => {
     try {
       const stateToSave = {
         wageEntries: state.wageEntries,
         ui: { theme: state.ui.theme } // Only persist theme, not temporary UI state
       };
       localStorage.setItem('wage-growth-state', JSON.stringify(stateToSave));
     } catch (err) {
       console.warn('Failed to save state to localStorage:', err);
     }
   };
   
   // Create listener middleware for localStorage persistence
   const listenerMiddleware = createListenerMiddleware();
   
   export const store = configureStore({
     reducer: {
       cpiData: cpiSlice.reducer,
       wageEntries: wageEntriesSlice.reducer,
       ui: uiSlice.reducer
     },
     preloadedState: loadState(),
     middleware: (getDefaultMiddleware) =>
       getDefaultMiddleware().prepend(listenerMiddleware.middleware)
   });
   
   // Set up persistence listener
   listenerMiddleware.startListening({
     predicate: (action, currentState, previousState) => {
       // Only save when wageEntries or theme changes
       return (
         currentState.wageEntries !== previousState?.wageEntries ||
         currentState.ui.theme !== previousState?.ui.theme
       );
     },
     effect: (action, listenerApi) => {
       saveState(listenerApi.getState() as RootState);
     }
   });
   
   export type RootState = ReturnType<typeof store.getState>;
   export type AppDispatch = typeof store.dispatch;
   
   // Typed hooks
   export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
   export const useAppSelector = useSelector.withTypes<RootState>();
   ```

2. **CPI Data Service** ✅
   - ✅ Async thunks for fetching CPI data
   - ✅ Support for multiple countries (US, CA, UK)
   - ✅ CPI filename mapping for US inconsistency
   - ✅ Error handling and loading states
   - ✅ Date range calculation from CPI data
   
   export const cpiApi = createApi({
     reducerPath: 'cpiApi',
     baseQuery: fetchBaseQuery({
       baseUrl: `https://${import.meta.env.VITE_CPI_DOMAIN}/cpi/processed`
     }),
     endpoints: (builder) => ({
       getCPIData: builder.query<CPIData, string>({
         query: (country) => `${country}/CPI_${country.toUpperCase()}_ALL.json`,
         keepUnusedDataFor: 3600 // Cache for 1 hour
       })
     })
   });
   
   export const { useGetCPIDataQuery } = cpiApi;
   ```

### Phase 3: Entry Components (Days 5-6) ✅ COMPLETED
1. **Country & Currency Selection** ✅
   - ✅ Dropdown with flag icons (Font Awesome)
   - ✅ Update Redux state on change
   - ✅ Clear entries when country changes with confirmation

2. **Wage Entry Form** ✅
   - ✅ Mode selector (annual vs paycheck) with locking after first entry
   - ✅ Conditional date picker
   - ✅ Currency-formatted input with proper validation
   - ✅ Pre-tax information tooltip with expandable help
   - ✅ Validation against available CPI dates
   - ✅ Support for future dates with informative messaging

3. **Entries Management** ✅
   - ✅ Sortable table/list view
   - ✅ Inline editing with validation
   - ✅ Delete with confirmation
   - ✅ Minimum 2 entries validation
   - ✅ Today's value column (inflation-adjusted)
   - ✅ Percentage change columns (nominal & real)
   - ✅ Clear all button with confirmation dialog
   - ✅ Toast notifications for all actions
   - ✅ Entry mode locking to prevent data inconsistency
   - ⚪ Mobile responsive design improvements needed

### Phase 4: Calculations & Visualization (Days 7-8) ⚪ PARTIALLY COMPLETE
1. **Calculation Engine** ✅
   - ✅ Implemented in `utils/inflationCalculator.ts`
   - ✅ `getCPIForDate()` with interpolation and future date handling
   - ✅ `adjustToLatestCPI()` for current dollar calculations
   - ✅ `calculatePercentageChange()` for growth tracking
   - ✅ Formatting utilities with color coding

2. **Chart Component**
   - Line chart with nominal vs real wages
   - Inflation impact shading
   - Responsive with Recharts
   - Dark mode support
   - Interactive tooltips

3. **Statistics Panel**
   - Best/worst years
   - Growth percentages
   - Cumulative inflation impact
   - Win/loss record

### Phase 5: Sharing & Polish (Days 9-10) ⚪ PARTIALLY COMPLETE
1. **URL Sharing** ⏳ Not Started
   - Compress entries with pako
   - Base64 encode for URL
   - Generate shareable link
   - Handle shared route decoding

2. **Sample Data** ✅
   - ✅ Realistic wage progression for each country
   - ✅ Toast notification when loaded
   - ✅ Clear all button with confirmation

3. **Educational Content**
   - About page with inflation explanation
   - Expandable info sections
   - Links to source data

4. **Final Polish**
   - Loading states
   - Error boundaries
   - Empty states
   - Accessibility improvements

## Key Implementation Details

### Modern Design System
```css
/* Tailwind v4.1 Config */
:root {
  /* Modern color palette */
  --primary: #4f46e5; /* Indigo */
  --primary-dark: #6366f1;
  --accent: #10b981; /* Emerald */
  --background: #ffffff;
  --background-dark: #0f172a;
  --surface: rgba(255, 255, 255, 0.8);
  --surface-dark: rgba(15, 23, 42, 0.8);
  
  /* Glass morphism */
  --blur: blur(10px);
  --shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

/* Component styling */
.glass-card {
  background: var(--surface);
  backdrop-filter: var(--blur);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: var(--shadow);
}
```

### Dark Mode Implementation
```tsx
// contexts/ThemeContext.tsx
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);
  
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
```

### Smooth Animations with Framer Motion
```tsx
// components/AnimatedCard.tsx
import { motion } from 'framer-motion';

export const AnimatedCard = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className="glass-card p-6"
  >
    {children}
  </motion.div>
);
```

### CPI Date Matching Logic
```typescript
// For annual entries:
// - Simple: Use December CPI of that year
// - Averaged: Calculate mean of all 12 months

// For paycheck entries:
// - Find exact month match
// - If no exact match, interpolate between closest months
```

### URL Sharing Format
```typescript
// Shared data structure
interface SharedData {
  version: 1,
  country: 'US' | 'CA' | 'UK',
  currency: 'USD' | 'CAD' | 'GBP',
  entryMode: 'annual' | 'paycheck',
  entries: Array<{
    date: string, // ISO format
    amount: number,
    label?: string
  }>
}
```

## Testing Strategy
- Unit tests for calculation functions
- Component testing with React Testing Library
- E2E tests for critical user flows
- Accessibility testing with axe-core

## Performance Considerations
- Lazy load chart library
- Memoize expensive calculations
- Debounce form inputs
- Cache CPI data in localStorage
- Code split routes

## Future Enhancements (Phase 2+)
- Additional countries (EU, Australia, etc.)
- CSV import/export
- PDF report generation
- Advanced chart options
- Historical wage comparisons
- API backend for user accounts