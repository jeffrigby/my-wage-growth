import type { CPIData, TableSettings, PayFrequency, WageEntry } from '../types';
import { PAY_FREQUENCIES, DEFAULT_PAY_FREQUENCY } from '../constants';

/**
 * Calculate the annual average CPI for a given year
 */
export const getAnnualAverageCPI = (year: number, cpiData: CPIData): number | null => {
  const yearMonths = [];
  
  // Collect all available months for the given year
  for (let month = 1; month <= 12; month++) {
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    if (cpiData.months[monthKey]) {
      yearMonths.push(cpiData.months[monthKey]);
    }
  }
  
  // Need at least one month to calculate
  if (yearMonths.length === 0) return null;
  
  // Calculate average
  const sum = yearMonths.reduce((acc, val) => acc + val, 0);
  return sum / yearMonths.length;
};

/**
 * Get CPI value for a specific date
 * For annual entries, uses either annual average or December CPI based on settings
 * For paycheck entries, uses the exact month or interpolates if needed
 * For future dates, uses the latest available CPI data
 */
export const getCPIForDate = (
  date: Date, 
  cpiData: CPIData,
  isAnnualEntry: boolean = false,
  calculationType: TableSettings['cpiCalculationType'] = 'annual-average'
): number | null => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-based
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
  
  // Get all available months sorted
  const availableMonths = Object.keys(cpiData.months).sort();
  if (availableMonths.length === 0) return null;
  
  const latestMonth = availableMonths[availableMonths.length - 1];
  const latestYear = parseInt(latestMonth.split('-')[0]);
  
  // Handle annual entries with calculation type
  if (isAnnualEntry) {
    // For future years, use the latest available data
    if (year > latestYear) {
      return cpiData.months[latestMonth];
    }
    
    if (calculationType === 'annual-average') {
      return getAnnualAverageCPI(year, cpiData);
    } else {
      // December calculation
      const decemberKey = `${year}-12`;
      if (cpiData.months[decemberKey]) {
        return cpiData.months[decemberKey];
      }
      // Fall back to latest month of that year if December not available
      const yearMonths = availableMonths.filter(m => m.startsWith(`${year}-`));
      if (yearMonths.length > 0) {
        return cpiData.months[yearMonths[yearMonths.length - 1]];
      }
    }
  }
  
  // For non-annual entries, continue with existing logic
  // If the requested date is in the future, use the latest available CPI
  if (monthKey > latestMonth) {
    return cpiData.months[latestMonth];
  }
  
  // Check if we have exact month data
  if (cpiData.months[monthKey]) {
    return cpiData.months[monthKey];
  }
  
  // If no exact match, try to find the closest available month
  // Find the closest month before and after the target date
  let prevMonth: string | null = null;
  let nextMonth: string | null = null;
  
  for (const month of availableMonths) {
    if (month < monthKey) {
      prevMonth = month;
    } else if (month > monthKey && !nextMonth) {
      nextMonth = month;
      break;
    }
  }
  
  // If we have both prev and next, interpolate
  if (prevMonth && nextMonth && cpiData.months[prevMonth] && cpiData.months[nextMonth]) {
    const prevDate = new Date(prevMonth + '-01');
    const nextDate = new Date(nextMonth + '-01');
    const targetTime = date.getTime();
    const prevTime = prevDate.getTime();
    const nextTime = nextDate.getTime();
    
    // Linear interpolation
    const ratio = (targetTime - prevTime) / (nextTime - prevTime);
    const prevCPI = cpiData.months[prevMonth];
    const nextCPI = cpiData.months[nextMonth];
    
    return prevCPI + (nextCPI - prevCPI) * ratio;
  }
  
  // If we only have previous month, use that
  if (prevMonth && cpiData.months[prevMonth]) {
    return cpiData.months[prevMonth];
  }
  
  // If we only have next month, use that
  if (nextMonth && cpiData.months[nextMonth]) {
    return cpiData.months[nextMonth];
  }
  
  return null;
};

/**
 * Get the latest available CPI date and value
 */
export const getLatestCPI = (cpiData: CPIData): { date: string; value: number } | null => {
  const months = Object.keys(cpiData.months).sort();
  if (months.length === 0) return null;
  
  const latestMonth = months[months.length - 1];
  return {
    date: latestMonth,
    value: cpiData.months[latestMonth]
  };
};

/**
 * Adjust an amount for inflation from one date to another
 */
export const adjustForInflation = (
  amount: number,
  fromDate: Date,
  toDate: Date,
  cpiData: CPIData,
  isAnnualEntry: boolean = false,
  calculationType: TableSettings['cpiCalculationType'] = 'annual-average'
): number | null => {
  const fromCPI = getCPIForDate(fromDate, cpiData, isAnnualEntry, calculationType);
  const toCPI = getCPIForDate(toDate, cpiData, false, calculationType); // toDate is never annual
  
  if (!fromCPI || !toCPI || fromCPI === 0) {
    return null;
  }
  
  return amount * (toCPI / fromCPI);
};

/**
 * Adjust an amount to the latest available CPI date
 */
export const adjustToLatestCPI = (
  amount: number,
  fromDate: Date,
  cpiData: CPIData,
  isAnnualEntry: boolean = false,
  calculationType: TableSettings['cpiCalculationType'] = 'annual-average'
): number | null => {
  const latest = getLatestCPI(cpiData);
  if (!latest) return null;
  
  const fromCPI = getCPIForDate(fromDate, cpiData, isAnnualEntry, calculationType);
  if (!fromCPI || fromCPI === 0) return null;
  
  return amount * (latest.value / fromCPI);
};

/**
 * Calculate percentage change between two values
 */
export const calculatePercentageChange = (
  currentValue: number,
  previousValue: number
): number | null => {
  if (previousValue === 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
};

/**
 * Format percentage for display
 */
export const formatPercentage = (percentage: number | null): string => {
  if (percentage === null) return '—';
  
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

/**
 * Get color class for percentage change
 */
export const getPercentageColorClass = (percentage: number | null): string => {
  if (percentage === null) return 'text-muted';
  if (percentage > 0) return 'text-green-600 dark:text-green-400';
  if (percentage < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted';
};

/**
 * Calculate the inflation rate between two dates
 * Uses year-over-year CPI change following BLS methodology
 */
export const calculateInflationRate = (
  fromDate: Date,
  toDate: Date,
  cpiData: CPIData,
  isAnnualEntry: boolean = false,
  calculationType: TableSettings['cpiCalculationType'] = 'annual-average'
): number | null => {
  const fromCPI = getCPIForDate(fromDate, cpiData, isAnnualEntry, calculationType);
  const toCPI = getCPIForDate(toDate, cpiData, isAnnualEntry, calculationType);

  if (!fromCPI || !toCPI || fromCPI === 0) {
    return null;
  }

  return ((toCPI - fromCPI) / fromCPI) * 100;
};

/**
 * Resolve an entry's pay frequency, applying the migration default when absent.
 * Single read-side default; see migration decision 6.
 */
export function getEntryPayFrequency(entry: Pick<WageEntry, 'payFrequency'>): PayFrequency {
  return entry.payFrequency ?? DEFAULT_PAY_FREQUENCY;
}

/**
 * Periods per year for a pay frequency (defaults when undefined).
 */
export function getPeriodsPerYear(payFrequency?: PayFrequency): number {
  return PAY_FREQUENCIES[payFrequency ?? DEFAULT_PAY_FREQUENCY].periodsPerYear;
}

/**
 * Annualize a per-paycheck amount: amount * periodsPerYear.
 */
export function annualizeAmount(amount: number, payFrequency?: PayFrequency): number {
  return amount * getPeriodsPerYear(payFrequency);
}

/**
 * Amount used in all comparison metrics: paycheck entries are annualized with
 * their own frequency; annual entries pass through unchanged. This gate is what
 * keeps annual math untouched.
 */
export function getAnnualizedAmount(
  entry: Pick<WageEntry, 'amount' | 'entryType' | 'payFrequency'>
): number {
  return entry.entryType === 'point-in-time'
    ? annualizeAmount(entry.amount, entry.payFrequency)
    : entry.amount;
}