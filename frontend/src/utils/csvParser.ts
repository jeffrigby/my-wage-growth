/**
 * CSV Parser utility for wage entry bulk import
 */

import { VALIDATION, ERROR_MESSAGES, DEFAULT_PAY_FREQUENCY } from '../constants';
import type { EntryMode, ImportWageEntryPayload, PayFrequency } from '../types';

export interface ParsedRow {
  rowNumber: number;
  date: string;
  amount: number;
  label?: string;
  payFrequency?: PayFrequency;
  errors: string[];
  isValid: boolean;
  detectedMode: 'annual' | 'paycheck' | null;
}

export interface ParseResult {
  rows: ParsedRow[];
  detectedMode: 'annual' | 'paycheck' | 'mixed' | null;
  validCount: number;
  errorCount: number;
  globalErrors: string[];
}

/**
 * Detect entry mode from date string
 * YYYY = annual, YYYY-MM-DD = paycheck
 */
function detectDateMode(dateValue: string): 'annual' | 'paycheck' | null {
  const trimmed = dateValue.trim();

  // Annual: exactly 4 digits (e.g., "2023")
  if (/^\d{4}$/.test(trimmed)) {
    return 'annual';
  }

  // Paycheck: YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return 'paycheck';
  }

  return null;
}

/**
 * Parse a date string based on detected mode
 */
function parseDate(dateValue: string, mode: 'annual' | 'paycheck'): Date | null {
  const trimmed = dateValue.trim();

  if (mode === 'annual') {
    const year = parseInt(trimmed, 10);
    if (isNaN(year)) return null;
    // Use January 1st for annual entries
    return new Date(year, 0, 1);
  }

  // Paycheck mode: YYYY-MM-DD
  const parts = trimmed.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const date = new Date(year, month, day);
  // Validate the date is valid (e.g., not Feb 31)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

/**
 * Parse amount string, removing currency symbols and commas
 */
function parseAmount(amountValue: string): number | null {
  // Remove currency symbols, commas, spaces
  const cleaned = amountValue.trim().replace(/[$£€,\s]/g, '');
  const amount = parseFloat(cleaned);

  if (isNaN(amount) || !isFinite(amount)) {
    return null;
  }

  return amount;
}

/**
 * Normalize a pay-frequency string to a canonical PayFrequency (case-insensitive)
 */
const normalizePayFrequency = (value: string): PayFrequency | null => {
  switch (value.toLowerCase().trim()) {
    case 'weekly':
      return 'weekly';
    case 'bi-weekly':
    case 'biweekly':
      return 'bi-weekly';
    case 'semi-monthly':
    case 'semimonthly':
      return 'semi-monthly';
    case 'monthly':
      return 'monthly';
    default:
      return null;
  }
};

/**
 * Detect CSV delimiter (comma, semicolon, or tab)
 */
function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || '';

  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    return ';';
  }
  if (tabCount > commaCount && tabCount > semicolonCount) {
    return '\t';
  }
  return ',';
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Find column indices from header row
 */
function findColumnIndices(headers: string[]): { date: number; amount: number; label: number; frequency: number } {
  const normalized = headers.map(h => h.toLowerCase().trim());

  const dateIndex = normalized.findIndex(h =>
    h === 'date' || h === 'year' || h === 'period'
  );

  const amountIndex = normalized.findIndex(h =>
    h === 'amount' || h === 'wage' || h === 'salary' || h === 'income' || h === 'pay'
  );

  const labelIndex = normalized.findIndex(h =>
    h === 'label' || h === 'description' || h === 'note' || h === 'notes' || h === 'name'
  );

  const frequencyIndex = normalized.findIndex(h =>
    h === 'frequency' || h === 'pay frequency' || h === 'pay_frequency' || h === 'payfrequency' || h === 'pay-frequency'
  );

  const date = dateIndex >= 0 ? dateIndex : 0;
  const amount = amountIndex >= 0 ? amountIndex : 1;

  // Label positional fallback (index 2) only applies when no other recognized column
  // already claims that slot — otherwise a headerless label swallows the frequency
  // (or amount) value of a `date,amount,frequency`-style CSV.
  let label = labelIndex;
  if (label < 0) {
    label = new Set([date, amount, frequencyIndex]).has(2) ? -1 : 2;
  }

  return {
    date,
    amount,
    label,
    // No positional fallback: -1 means the column is absent so the default applies
    frequency: frequencyIndex
  };
}

/**
 * Validate a single row
 */
function validateRow(
  rowNumber: number,
  date: string,
  amount: string,
  label: string | undefined,
  frequency: string | undefined,
  minYear: number,
  maxYear: number
): ParsedRow {
  const errors: string[] = [];

  // Detect date mode
  const detectedMode = detectDateMode(date);

  // Validate date
  if (!date || date.trim() === '') {
    errors.push('Date is required');
  } else if (!detectedMode) {
    errors.push('Invalid date format. Use YYYY for annual or YYYY-MM-DD for paycheck');
  } else {
    const parsedDate = parseDate(date, detectedMode);
    if (!parsedDate) {
      errors.push('Invalid date');
    } else {
      const year = parsedDate.getFullYear();
      if (year < minYear) {
        errors.push(`Year must be ${minYear} or later`);
      } else if (year > maxYear + 1) {
        // Allow 1 year into future for planning
        errors.push(`Year cannot be more than 1 year in the future`);
      }
    }
  }

  // Validate amount
  const parsedAmount = parseAmount(amount);
  if (parsedAmount === null) {
    errors.push('Invalid amount');
  } else if (parsedAmount < VALIDATION.MIN_WAGE_AMOUNT) {
    errors.push(`Amount must be at least ${VALIDATION.MIN_WAGE_AMOUNT}`);
  } else if (parsedAmount > VALIDATION.MAX_WAGE_AMOUNT) {
    errors.push(`Amount cannot exceed ${VALIDATION.MAX_WAGE_AMOUNT.toLocaleString()}`);
  }

  // Validate label (optional, but truncate if too long)
  const trimmedLabel = label?.trim().slice(0, 50);

  // Validate pay frequency (paycheck mode only; annual/null-mode rows ignore any value)
  let payFrequency: PayFrequency | undefined;
  if (detectedMode === 'paycheck') {
    if (!frequency || frequency.trim() === '') {
      payFrequency = DEFAULT_PAY_FREQUENCY;
    } else {
      const normalized = normalizePayFrequency(frequency);
      if (!normalized) {
        errors.push(ERROR_MESSAGES.INVALID_FREQUENCY);
      } else {
        payFrequency = normalized;
      }
    }
  }

  return {
    rowNumber,
    date: date.trim(),
    amount: parsedAmount ?? 0,
    label: trimmedLabel || undefined,
    payFrequency,
    errors,
    isValid: errors.length === 0,
    detectedMode
  };
}

/**
 * Main CSV parsing function
 */
export function parseCSV(content: string): ParseResult {
  const globalErrors: string[] = [];
  const rows: ParsedRow[] = [];

  // Normalize line endings and split
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Filter out empty lines
  const nonEmptyLines = lines.filter(line => line.trim() !== '');

  if (nonEmptyLines.length === 0) {
    return {
      rows: [],
      detectedMode: null,
      validCount: 0,
      errorCount: 0,
      globalErrors: ['CSV file is empty']
    };
  }

  // Detect delimiter
  const delimiter = detectDelimiter(content);

  // Parse header
  const headerLine = nonEmptyLines[0];
  const headers = parseCSVLine(headerLine, delimiter);
  const columnIndices = findColumnIndices(headers);

  // Check if we have required columns
  if (columnIndices.date === -1) {
    globalErrors.push('Missing "date" column in header');
  }
  if (columnIndices.amount === -1) {
    globalErrors.push('Missing "amount" column in header');
  }

  if (globalErrors.length > 0) {
    // Try to parse anyway using default positions
  }

  // Parse data rows
  const dataLines = nonEmptyLines.slice(1);

  if (dataLines.length === 0) {
    return {
      rows: [],
      detectedMode: null,
      validCount: 0,
      errorCount: 0,
      globalErrors: ['No data rows found (only header row)']
    };
  }

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const values = parseCSVLine(line, delimiter);

    const date = values[columnIndices.date] || '';
    const amount = values[columnIndices.amount] || '';
    const label = values[columnIndices.label];
    const frequencyValue = columnIndices.frequency >= 0 ? (values[columnIndices.frequency] || '') : '';

    const parsedRow = validateRow(
      i + 2, // Row number (1-indexed, accounting for header)
      date,
      amount,
      label,
      frequencyValue,
      VALIDATION.MIN_YEAR,
      VALIDATION.MAX_YEAR
    );

    rows.push(parsedRow);
  }

  // Determine overall detected mode
  const modes = rows
    .filter(r => r.detectedMode !== null)
    .map(r => r.detectedMode);

  const uniqueModes = [...new Set(modes)];

  let detectedMode: ParseResult['detectedMode'];

  if (uniqueModes.length === 0) {
    detectedMode = null;
  } else if (uniqueModes.length === 1) {
    detectedMode = uniqueModes[0] as 'annual' | 'paycheck';
  } else {
    detectedMode = 'mixed';
    globalErrors.push('CSV contains mixed date formats. All dates must use the same format (YYYY for annual or YYYY-MM-DD for paycheck)');
    // Mark all rows as invalid when mixed
    rows.forEach(row => {
      if (row.isValid) {
        row.errors.push('Mixed date formats in file');
        row.isValid = false;
      }
    });
  }

  const validCount = rows.filter(r => r.isValid).length;
  const errorCount = rows.filter(r => !r.isValid).length;

  return {
    rows,
    detectedMode,
    validCount,
    errorCount,
    globalErrors
  };
}

/**
 * Check if imported entries would conflict with existing entry mode
 */
export function checkEntryModeConflict(
  importedMode: 'annual' | 'paycheck' | 'mixed' | null,
  existingEntryMode: EntryMode | null,
  hasExistingEntries: boolean
): string | null {
  if (!hasExistingEntries || !existingEntryMode || !importedMode) {
    return null;
  }

  if (importedMode === 'mixed') {
    return 'CSV contains mixed date formats';
  }

  // Map entry modes
  const existingIsAnnual = existingEntryMode === 'annual';
  const importedIsAnnual = importedMode === 'annual';

  if (existingIsAnnual !== importedIsAnnual) {
    const existingLabel = existingIsAnnual ? 'annual' : 'paycheck';
    const importedLabel = importedIsAnnual ? 'annual' : 'paycheck';
    return `Your existing entries use ${existingLabel} mode, but this CSV contains ${importedLabel}-format dates. Clear existing entries first, or use a CSV with ${existingLabel} dates.`;
  }

  return null;
}

/**
 * Convert parsed rows to wage entry format for import
 */
export function convertToWageEntries(
  rows: ParsedRow[],
  detectedMode: 'annual' | 'paycheck'
): ImportWageEntryPayload[] {
  return rows
    .filter(row => row.isValid)
    .map(row => {
      const parsedDate = parseDate(row.date, detectedMode);
      if (!parsedDate) {
        throw new Error(`Invalid date: ${row.date}`);
      }

      return {
        date: parsedDate.toISOString(),
        amount: row.amount,
        label: row.label,
        entryType: detectedMode === 'annual' ? 'annual-simple' as const : 'point-in-time' as const,
        ...(detectedMode === 'paycheck' && { payFrequency: row.payFrequency ?? DEFAULT_PAY_FREQUENCY })
      };
    });
}

/**
 * Generate a template CSV for download
 */
export function generateTemplateCSV(mode: 'annual' | 'paycheck'): string {
  if (mode === 'annual') {
    return `date,amount,label
2020,50000,Starting salary
2021,52000,Annual raise
2022,55000,Promotion
2023,58000,Cost of living adjustment
2024,62000,Current salary`;
  }

  return `date,amount,label,frequency
2024-01-15,2500.00,January paycheck,monthly
2024-02-15,2500.00,February paycheck,monthly
2024-03-15,2650.00,After raise,monthly
2024-04-15,2650.00,April paycheck,monthly
2024-05-15,2650.00,May paycheck,monthly`;
}

/**
 * Trigger download of a CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
