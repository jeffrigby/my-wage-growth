import type { CPIData } from '../types';

/**
 * Get CPI value for a specific date
 * For annual entries, uses the CPI value for January of that year
 * For paycheck entries, uses the exact month or interpolates if needed
 */
export const getCPIForDate = (date: Date, cpiData: CPIData): number | null => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-based
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
  
  // Check if we have exact month data
  if (cpiData.months[monthKey]) {
    return cpiData.months[monthKey];
  }
  
  // If no exact match, try to find the closest available month
  const availableMonths = Object.keys(cpiData.months).sort();
  
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
  cpiData: CPIData
): number | null => {
  const fromCPI = getCPIForDate(fromDate, cpiData);
  const toCPI = getCPIForDate(toDate, cpiData);
  
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
  cpiData: CPIData
): number | null => {
  const latest = getLatestCPI(cpiData);
  if (!latest) return null;
  
  const fromCPI = getCPIForDate(fromDate, cpiData);
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