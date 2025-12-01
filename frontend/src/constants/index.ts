// Application constants and configuration

import type { CountryMetadata } from '../types';

// Country metadata with icons and settings
export const COUNTRIES: Record<string, CountryMetadata> = {
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    flag: '🇺🇸',
    cpiSource: 'Bureau of Labor Statistics',
    cpiDescription: 'Consumer Price Index for All Urban Consumers (CPI-U)'
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'Can$',
    flag: '🇨🇦',
    cpiSource: 'Statistics Canada',
    cpiDescription: 'Consumer Price Index (CPI)'
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    flag: '🇬🇧',
    cpiSource: 'Office for National Statistics',
    cpiDescription: 'Consumer Prices Index (CPI)'
  }
} as const;

// Theme options
export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: 'fa-sun' },
  { value: 'dark', label: 'Dark', icon: 'fa-moon' },
  { value: 'system', label: 'System', icon: 'fa-desktop' }
] as const;

// Entry mode options
export const ENTRY_MODE_OPTIONS = [
  {
    value: 'annual',
    label: 'Annual Wages',
    description: 'Enter total yearly earnings (W-2, tax returns)',
    icon: 'fa-calendar-alt'
  },
  {
    value: 'paycheck',
    label: 'Paycheck Amounts',
    description: 'Enter individual paycheck amounts with specific dates',
    icon: 'fa-money-check'
  }
] as const;

// Date format constants
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_YEAR_ONLY: 'yyyy',
  DISPLAY_MONTH_YEAR: 'MMM yyyy',
  ISO: 'yyyy-MM-dd',
  API_MONTH: 'yyyy-MM',
  CHART_LABEL: 'MMM yy'
} as const;

// Chart configuration
export const CHART_CONFIG = {
  COLORS: {
    NOMINAL_WAGE: '#00FF85',   // Neon green
    REAL_WAGE: '#1E90FF',      // Electric blue
    INFLATION_FILL: '#FF0099', // Vivid pink for inflation
    GRID: '#e5e7eb',           // Light gray for light mode
    GRID_DARK: '#333333'       // Dark gray for dark mode
  },
  ANIMATION_DURATION: 750,
  TOOLTIP_ANIMATION_DURATION: 150
} as const;

// Currency formatting options
export const CURRENCY_FORMAT_OPTIONS: Record<string, Intl.NumberFormatOptions> = {
  USD: {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  },
  CAD: {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  },
  GBP: {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }
} as const;

// Validation constants
export const VALIDATION = {
  MIN_WAGE_AMOUNT: 0.01,
  MAX_WAGE_AMOUNT: 999999999,
  MIN_YEAR: 1990,
  MAX_YEAR: new Date().getFullYear(),
  MIN_ENTRIES_FOR_CALCULATION: 2,
  MAX_ENTRIES: 50
} as const;

// localStorage keys
export const STORAGE_KEYS = {
  APP_STATE: 'wage-growth-state',
  CPI_CACHE: 'cpi-data-cache',
  USER_PREFERENCES: 'user-preferences'
} as const;

// API configuration
export const API_CONFIG = {
  CPI_BASE_URL: `https://${import.meta.env.VITE_CPI_DOMAIN}/cpi/processed`,
  CACHE_DURATION: 3600000, // 1 hour in milliseconds
  REQUEST_TIMEOUT: 30000,   // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000        // 1 second
} as const;

// CPI filename mapping for each country
// US uses CPI_U_ALL instead of CPI_US_ALL
export const CPI_SERIES_MAPPING: Record<string, string> = {
  US: 'CPI_U_ALL',
  CA: 'CPI_CA_ALL', 
  UK: 'CPI_UK_ALL'
} as const;

// Animation variants for Framer Motion
export const ANIMATION_VARIANTS = {
  FADE_IN: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  SLIDE_UP: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  SLIDE_DOWN: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  SCALE_IN: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  },
  STAGGER_CHILDREN: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
} as const;

// Breakpoint values (should match Tailwind config)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  CPI_FETCH_ERROR: 'Failed to load inflation data. Please try again.',
  INVALID_DATE: 'Please enter a valid date.',
  INVALID_AMOUNT: 'Please enter a valid wage amount.',
  AMOUNT_TOO_LOW: `Wage amount must be at least $${VALIDATION.MIN_WAGE_AMOUNT}.`,
  AMOUNT_TOO_HIGH: `Wage amount cannot exceed $${VALIDATION.MAX_WAGE_AMOUNT.toLocaleString()}.`,
  DATE_TOO_EARLY: `Date must be ${VALIDATION.MIN_YEAR} or later.`,
  DATE_TOO_LATE: 'Date cannot be in the future.',
  INSUFFICIENT_ENTRIES: `You need at least ${VALIDATION.MIN_ENTRIES_FOR_CALCULATION} wage entries to calculate growth.`,
  TOO_MANY_ENTRIES: `You can have a maximum of ${VALIDATION.MAX_ENTRIES} wage entries.`,
  CPI_DATA_UNAVAILABLE: 'Inflation data is not available for the selected date.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  ENTRY_ADDED: 'Wage entry added successfully.',
  ENTRY_UPDATED: 'Wage entry updated successfully.',
  ENTRY_DELETED: 'Wage entry deleted successfully.',
  ALL_ENTRIES_CLEARED: 'All wage entries have been cleared.',
  DATA_SHARED: 'Share link copied to clipboard.',
  SAMPLE_DATA_LOADED: 'Sample data loaded. You can now see how the calculator works!',
  THEME_CHANGED: 'Theme updated successfully.'
} as const;

// Sample wage data for different countries
export const SAMPLE_DATA = {
  US: [
    { date: new Date(2020, 0, 1), amount: 55000, label: '2020 Salary' },
    { date: new Date(2021, 0, 1), amount: 58000, label: '2021 Salary' },
    { date: new Date(2022, 0, 1), amount: 62000, label: '2022 Salary' },
    { date: new Date(2023, 0, 1), amount: 67000, label: '2023 Salary' },
    { date: new Date(2024, 0, 1), amount: 72000, label: '2024 Salary' }
  ],
  CA: [
    { date: new Date(2020, 0, 1), amount: 65000, label: '2020 Salary' },
    { date: new Date(2021, 0, 1), amount: 68000, label: '2021 Salary' },
    { date: new Date(2022, 0, 1), amount: 72000, label: '2022 Salary' },
    { date: new Date(2023, 0, 1), amount: 77000, label: '2023 Salary' },
    { date: new Date(2024, 0, 1), amount: 82000, label: '2024 Salary' }
  ],
  UK: [
    { date: new Date(2020, 0, 1), amount: 35000, label: '2020 Salary' },
    { date: new Date(2021, 0, 1), amount: 37000, label: '2021 Salary' },
    { date: new Date(2022, 0, 1), amount: 40000, label: '2022 Salary' },
    { date: new Date(2023, 0, 1), amount: 43000, label: '2023 Salary' },
    { date: new Date(2024, 0, 1), amount: 46000, label: '2024 Salary' }
  ]
} as const;

// Feature flags for development
export const FEATURE_FLAGS = {
  ENABLE_ADVANCED_CHARTS: false,
  ENABLE_CSV_EXPORT: false,
  ENABLE_PDF_REPORTS: false,
  ENABLE_MULTIPLE_CURRENCIES: false,
  ENABLE_BETA_FEATURES: false
} as const;