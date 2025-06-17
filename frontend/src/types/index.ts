// Core data types for the wage growth calculator

export type Country = 'US' | 'CA' | 'UK';
export type Currency = 'USD' | 'CAD' | 'GBP';
export type EntryMode = 'annual' | 'paycheck';
export type Theme = 'light' | 'dark' | 'system';

// CPI Data structure from backend
export interface CPIData {
  lastUpdated: string;
  source: string;
  months: Record<string, number>; // Format: "YYYY-MM" -> CPI value
}

// Date range for available CPI data
export interface CPIDateRange {
  minDate: string; // YYYY-MM format
  maxDate: string; // YYYY-MM format
  minYear: number;
  maxYear: number;
}

// Multi-country CPI data structure
export interface CPIDataState {
  us: CPIData | null;
  ca: CPIData | null;
  uk: CPIData | null;
  dateRanges: {
    us: CPIDateRange | null;
    ca: CPIDateRange | null;
    uk: CPIDateRange | null;
  };
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}

// Individual wage entry
export interface WageEntry {
  id: string;
  date: Date;
  amount: number;
  entryType: 'point-in-time' | 'annual-simple' | 'annual-averaged';
  label?: string;
  createdAt: Date;
}

// Wage entries state
export interface WageEntriesState {
  entries: WageEntry[];
  country: Country;
  currency: Currency;
  entryMode: EntryMode;
}

// UI state
export interface UIState {
  theme: Theme;
  showIntro: boolean;
  sampleDataLoaded: boolean;
  isCalculating: boolean;
  shareModalOpen: boolean;
  wageEntryModalOpen: boolean;
  editingEntryId: string | null;
}

// Remove this - we'll let Redux Toolkit infer the type

// Calculated results for display
export interface CalculatedWageEntry extends WageEntry {
  nominalAmount: number;
  realAmount: number; // Adjusted to current dollars
  cpiValue: number;
  growthRate?: number; // Year-over-year growth rate
}

// Statistics for the results panel
export interface WageStatistics {
  totalRealGrowth: number;
  averageAnnualGrowthRate: number;
  bestYear: {
    year: number;
    growthRate: number;
    realAmount: number;
  } | null;
  worstYear: {
    year: number;
    growthRate: number;
    realAmount: number;
  } | null;
  inflationImpact: {
    totalLoss: number;
    percentage: number;
  };
  winLossRecord: {
    wins: number;
    losses: number;
    neutral: number;
  };
}

// URL sharing data structure
export interface SharedData {
  version: 1;
  country: Country;
  currency: Currency;
  entryMode: EntryMode;
  entries: Array<{
    date: string; // ISO format
    amount: number;
    label?: string;
  }>;
}

// Form validation errors
export interface ValidationErrors {
  date?: string;
  amount?: string;
  general?: string;
}

// Chart data point
export interface ChartDataPoint {
  date: string;
  year: number;
  nominalWage: number;
  realWage: number;
  cpi: number;
  label?: string;
}

// Country metadata
export interface CountryMetadata {
  code: Country;
  name: string;
  currency: Currency;
  currencySymbol: string;
  flag: string; // Font Awesome icon class
  cpiSource: string;
  cpiDescription: string;
}

// Sample data entry
export interface SampleEntry {
  date: Date;
  amount: number;
  label: string;
}

// Redux action payload types
export interface AddWageEntryPayload {
  date: Date;
  amount: number;
  label?: string;
}

export interface UpdateWageEntryPayload {
  id: string;
  updates: Partial<Omit<WageEntry, 'id' | 'createdAt'>>;
}

export interface SetCountryPayload {
  country: Country;
  currency: Currency;
}

// API response types
export interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent';
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

// Utility types for Redux Toolkit
export type AsyncThunkStatus = 'idle' | 'loading' | 'succeeded' | 'failed';