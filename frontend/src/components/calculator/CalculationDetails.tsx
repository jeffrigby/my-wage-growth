import React from 'react';
import { format } from 'date-fns';
import { Modal } from '../ui/Modal';
import { getLatestCPI, getCPIForDate, formatPercentage, getPercentageColorClass } from '../../utils/inflationCalculator';
import { COUNTRIES, DATE_FORMATS } from '../../constants';
import type { WageEntry, CPIData, TableSettings } from '../../types';

interface CalculationDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  entry: WageEntry;
  previousEntry?: WageEntry;
  cpiData: CPIData | null;
  calculationType: TableSettings['cpiCalculationType'];
  country: string;
}

export const CalculationDetails: React.FC<CalculationDetailsProps> = ({
  isOpen,
  onClose,
  entry,
  previousEntry,
  cpiData,
  calculationType,
  country
}) => {
  if (!cpiData) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Calculation Details">
        <div className="p-6">
          <p className="text-muted">CPI data is not available yet.</p>
        </div>
      </Modal>
    );
  }

  const isAnnualEntry = entry.entryType.includes('annual');
  const entryDate = new Date(entry.date);
  const entryCPI = getCPIForDate(entryDate, cpiData, isAnnualEntry, calculationType);
  const latestCPIData = getLatestCPI(cpiData);
  const countryInfo = COUNTRIES[country];

  // Calculate today's value
  const todaysValue = entryCPI && latestCPIData 
    ? entry.amount * (latestCPIData.value / entryCPI)
    : null;

  // Calculate growth percentages if previous entry exists
  let nominalGrowth: number | null = null;
  let realGrowth: number | null = null;
  let previousCPI: number | null = null;
  let previousTodaysValue: number | null = null;

  if (previousEntry) {
    const previousIsAnnual = previousEntry.entryType.includes('annual');
    previousCPI = getCPIForDate(new Date(previousEntry.date), cpiData, previousIsAnnual, calculationType);
    
    if (previousCPI && latestCPIData) {
      previousTodaysValue = previousEntry.amount * (latestCPIData.value / previousCPI);
    }

    // Nominal growth
    nominalGrowth = ((entry.amount - previousEntry.amount) / previousEntry.amount) * 100;
    
    // Real growth
    if (todaysValue && previousTodaysValue) {
      realGrowth = ((todaysValue - previousTodaysValue) / previousTodaysValue) * 100;
    }
  }

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    return `${countryInfo.currencySymbol}${formatted}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Calculation Details">
      <div className="p-6 space-y-6">
        {/* Entry Information */}
        <div>
          <h3 className="text-sm font-semibold text-muted mb-3">Entry Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Date:</span>
              <span>{format(entryDate, DATE_FORMATS.DISPLAY)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Amount:</span>
              <span>{formatCurrency(entry.amount)}</span>
            </div>
            {entry.label && (
              <div className="flex justify-between">
                <span className="text-secondary">Label:</span>
                <span>{entry.label}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-secondary">Entry Type:</span>
              <span className="capitalize">{entry.entryType.replace('-', ' ')}</span>
            </div>
          </div>
        </div>

        {/* CPI Values */}
        <div>
          <h3 className="text-sm font-semibold text-muted mb-3">CPI Values</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">
                {isAnnualEntry && calculationType === 'annual-average' 
                  ? `${entryDate.getFullYear()} Annual Average CPI:`
                  : isAnnualEntry && calculationType === 'december'
                  ? `${entryDate.getFullYear()} December CPI:`
                  : `${format(entryDate, 'MMMM yyyy')} CPI:`
                }
              </span>
              <span>{entryCPI ? entryCPI.toFixed(2) : 'N/A'}</span>
            </div>
            {latestCPIData && (
              <div className="flex justify-between">
                <span className="text-secondary">
                  Latest CPI ({format(new Date(latestCPIData.date + '-01'), 'MMM yyyy')}):
                </span>
                <span>{latestCPIData.value.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Today's Value Calculation */}
        {entryCPI && latestCPIData && (
          <div>
            <h3 className="text-sm font-semibold text-muted mb-3">Today's Value Calculation</h3>
            <div className="bg-surface-secondary p-4 rounded-lg space-y-3">
              <div className="text-sm font-mono">
                {formatCurrency(entry.amount)} × ({latestCPIData.value.toFixed(2)} / {entryCPI.toFixed(2)})
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary">Result:</span>
                <span className="text-lg font-semibold">
                  {todaysValue ? formatCurrency(todaysValue) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Growth Calculations */}
        {previousEntry && (
          <div>
            <h3 className="text-sm font-semibold text-muted mb-3">Growth Calculations</h3>
            <div className="space-y-3">
              {/* Nominal Growth */}
              <div className="bg-surface-secondary p-4 rounded-lg">
                <h4 className="text-xs font-medium text-muted mb-2">Nominal Growth</h4>
                <div className="text-sm font-mono mb-2">
                  ({formatCurrency(entry.amount)} - {formatCurrency(previousEntry.amount)}) / {formatCurrency(previousEntry.amount)} × 100
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Result:</span>
                  <span className={`font-semibold ${getPercentageColorClass(nominalGrowth)}`}>
                    {formatPercentage(nominalGrowth)}
                  </span>
                </div>
              </div>

              {/* Real Growth */}
              {todaysValue && previousTodaysValue && (
                <div className="bg-surface-secondary p-4 rounded-lg">
                  <h4 className="text-xs font-medium text-muted mb-2">Real Growth (Inflation-Adjusted)</h4>
                  <div className="text-sm font-mono mb-2">
                    ({formatCurrency(todaysValue)} - {formatCurrency(previousTodaysValue)}) / {formatCurrency(previousTodaysValue)} × 100
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary">Result:</span>
                    <span className={`font-semibold ${getPercentageColorClass(realGrowth)}`}>
                      {formatPercentage(realGrowth)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="border-t border-border pt-4">
          <div className="flex items-start space-x-2">
            <i className="fas fa-info-circle text-accent mt-0.5 text-sm"></i>
            <div className="text-xs text-secondary space-y-1">
              <p>
                <strong>CPI (Consumer Price Index)</strong> measures the average change in prices 
                over time that consumers pay for goods and services.
              </p>
              <p>
                Data source: {countryInfo.cpiSource}
              </p>
              {isAnnualEntry && calculationType === 'annual-average' && (
                <p>
                  Annual average CPI is calculated by averaging all 12 monthly CPI values for the year.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};