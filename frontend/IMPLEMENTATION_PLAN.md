# Real Wage Growth Calculator - Frontend Implementation Plan

## Overview
A responsive web application that helps users visualize their wage growth compared to inflation over time. Users enter their historical wages, and the app shows them their real purchasing power adjusted for inflation using CPI data.

## Design Philosophy
- **Editorial Aesthetic** (commit 71d56ed): Clean, data-journalism inspired design
- **Typography**: Fraunces serif for headlines, DM Sans for body text
- **Color Palette**: Deep navy primary (#1E3A5F light, #5B8BD4 dark), warm accents
- **Visual Style**: Minimal decoration, functional UI, let data be the hero
- **Smooth Transitions**: Framer Motion for delightful animations
- **Accessibility**: Radix UI primitives, keyboard navigation, ARIA labels
- **Best Practices**: Following latest patterns from Redux Toolkit v2.8, React Router v7, and React 19

## Technical Stack
- **Framework**: React 19 with TypeScript
- **Bundler**: Vite 6.3
- **Routing**: React Router v7
- **State Management**: Redux Toolkit v2.8 with listener middleware
- **Styling**: Tailwind CSS v4.1 with editorial design system
- **Icons**: Font Awesome ✅ + custom SVG icons
- **UI Primitives**: Radix UI ✅ (tooltips)
- **Charts**: Recharts 3.1 ✅
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
   - ✅ Preserve entries when country changes (commit 996073f)
   - ✅ Recalculate inflation with new country's CPI data
   - ✅ Update currency symbols automatically

2. **Wage Entry Form** ✅
   - ✅ Mode selector (annual vs paycheck) with locking after first entry
   - ✅ Modal-based editing (commit c896d07 removed inline quick-edit)
   - ✅ Conditional date picker
   - ✅ Currency-formatted input with proper validation (step="0.01")
   - ✅ Pre-tax information tooltip with expandable help
   - ✅ Context-aware help adapting to country and entry mode (commit a35c795)
   - ✅ Validation against available CPI dates
   - ✅ Support for future dates with informative messaging
   - ✅ Terminology: "Gross Pay" instead of "Amount" (commit c896d07)

3. **Entries Management** ✅
   - ✅ Table with expandable row drawers (commit 710451c)
   - ✅ Click row to reveal actions (Details, Edit, Delete)
   - ✅ Keyboard accessibility (Enter/Space to toggle, Escape to close)
   - ✅ Click-outside-to-close behavior
   - ✅ Delete with confirmation
   - ✅ Minimum 2 entries validation
   - ✅ Today's value column (inflation-adjusted)
   - ✅ Three-column metrics: Raise, Inflation, Gain (commit b7e2397)
   - ✅ Column header tooltips with Radix UI (commit b7e2397)
   - ✅ Parallel terminology: "Gain/Loss" and "Real Gain/Loss" (commit ef7cf78)
   - ✅ Color-coded growth indicators
   - ✅ Calculation details modal with formulas
   - ✅ CPI data date range display in table footer
   - ✅ CSV bulk import with drag-and-drop (commit c71e866)
   - ✅ Auto-detection of annual vs paycheck formats
   - ✅ Preview and validate before importing
   - ✅ Template generation for easy setup
   - ✅ Clear all button with confirmation dialog
   - ✅ Toast notifications for all actions
   - ✅ Entry mode locking to prevent data inconsistency

4. **Help & Guidance** ✅
   - ✅ Pre-tax income help page at /help/pre-tax (commit a35c795)
   - ✅ Country-specific guidance (W-2, T4, P60)
   - ✅ Context-aware modal help text
   - ✅ Adapts to selected country and entry mode

### Phase 4: Calculations & Visualization (Days 7-8) 🟡 IN PROGRESS
1. **Calculation Engine** ✅ COMPLETE
   - ✅ Implemented in `utils/inflationCalculator.ts`
   - ✅ `getCPIForDate()` with interpolation and future date handling
   - ✅ `adjustToLatestCPI()` for current dollar calculations
   - ✅ `calculatePercentageChange()` for growth tracking
   - ✅ `calculateInflationRate()` following BLS methodology (commit b7e2397)
   - ✅ Formatting utilities with color coding (`formatPercentage`, `getPercentageColorClass`)
   - ✅ Support for both annual and paycheck calculation modes

2. **Chart Component** ⏳ NOT STARTED
   - ⏳ Line chart with nominal vs real wages
   - ⏳ Inflation impact shading
   - ⏳ Responsive with Recharts 3.1
   - ⏳ Dark mode support matching editorial theme
   - ⏳ Interactive tooltips

3. **Statistics Panel** ⏳ NOT STARTED
   - ⏳ Best/worst years
   - ⏳ Growth percentages
   - ⏳ Cumulative inflation impact
   - ⏳ Win/loss record

### Phase 5: Sharing & Polish (Days 9-10) 🟡 IN PROGRESS
1. **URL Sharing** ⏳ NOT STARTED
   - ⏳ Compress entries with pako (already installed)
   - ⏳ Base64 encode for URL
   - ⏳ Generate shareable link
   - ⏳ Handle shared route decoding

2. **Sample Data** ✅ COMPLETE
   - ✅ Realistic wage progression for each country
   - ✅ Toast notification when loaded
   - ✅ Clear all button with confirmation

3. **Educational Content** 🟡 PARTIALLY COMPLETE
   - ✅ Pre-tax income help page (commit a35c795)
   - ✅ Country-specific guidance
   - ⏳ About page with inflation explanation
   - ⏳ Expandable info sections
   - ⏳ Links to source data

4. **Final Polish** 🟡 PARTIALLY COMPLETE
   - ✅ Loading states (CPILoadingOverlay)
   - ✅ Toast notifications with react-hot-toast
   - ✅ Empty states (sample data prompt)
   - ✅ Accessibility improvements (Radix UI, keyboard navigation, ARIA labels)
   - ⏳ Error boundaries
   - ⏳ Mobile responsive design improvements

## Key Implementation Details

### Editorial Design System (commit 71d56ed)
```css
/* Tailwind v4.1 Config */
:root {
  /* Editorial color palette */
  --primary: #1E3A5F;           /* Deep navy */
  --primary-hover: #2C4A73;
  --primary-light: #E8EDF2;

  --accent: #2D6A4F;            /* Warm green */
  --accent-light: #D8E9E0;

  /* Neutral palette - warm undertones */
  --background: #FAFAF8;
  --surface: #FFFFFF;
  --border: #E8E6E1;
  --border-light: #F2F0EB;

  /* Text colors */
  --text-primary: #1A1A1A;
  --text-secondary: #4A4A4A;
  --text-muted: #7A7A7A;

  /* Data visualization */
  --positive: #2D6A4F;
  --negative: #64748B;

  /* Shadows - subtle, warm */
  --shadow-sm: 0 1px 2px rgba(26, 26, 26, 0.04);
  --shadow-md: 0 4px 12px rgba(26, 26, 26, 0.06);
  --shadow-lg: 0 8px 24px rgba(26, 26, 26, 0.08);

  /* Typography */
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Component styling */
.card {
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
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

## Recent Updates (Commits Since Documentation)

### Editorial Redesign (commit 71d56ed)
- Replaced cyberpunk/neon aesthetic with data-journalism design
- New typography: Fraunces serif headlines, DM Sans body
- Deep navy primary color with warm accents
- Custom SVG icons replacing some Font Awesome icons
- Minimal, functional UI focused on data

### Table UX Improvements
- **Expandable Row Drawers** (commit 710451c): Click-to-expand actions, keyboard navigation
- **Three-Column Metrics** (commit b7e2397): Raise, Inflation, Gain columns with tooltips
- **Terminology Updates** (commit c896d07, ef7cf78): "Gross Pay", "Change", "Gain/Loss"
- **Radix UI Tooltips** (commit b7e2397): Accessible, well-positioned explanatory content

### CSV Bulk Import (commit c71e866)
- Drag-and-drop upload with preview
- Auto-detection of annual vs paycheck formats
- Comprehensive validation with error reporting
- Template generation

### Country Switching (commit 996073f)
- Preserves entries when switching countries
- Recalculates with new CPI data
- Updates currency symbols

### Help Pages (commit a35c795)
- New /help/pre-tax page
- Country-specific guidance (W-2, T4, P60)
- Context-aware modal help text

### Backend Updates
- **AppConfig IAM** (commit 951ab1d): Fixed Lambda authorization errors
- **Vitest v4** (commit bc94366): Upgraded test framework

## Future Enhancements (Phase 2+)
- Interactive charts with Recharts
- Statistics panel
- URL sharing with compressed data
- CSV export
- PDF report generation
- Advanced chart options
- Historical wage comparisons
- Additional countries (EU, Australia, etc.)
- API backend for user accounts