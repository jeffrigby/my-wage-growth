import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '../../store';
import { openWageEntryModal } from '../../store/slices/uiSlice';
import { deleteWageEntry, loadSampleData, clearAllEntries } from '../../store/slices/wageEntriesSlice';
import { fetchCPIData, selectCPIDataByCountry } from '../../store/slices/cpiSlice';
import { ANIMATION_VARIANTS, COUNTRIES, SAMPLE_DATA, DATE_FORMATS, SUCCESS_MESSAGES } from '../../constants';
import { EditableTableRow } from './EditableTableRow';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TableSettings } from './TableSettings';
import { adjustToLatestCPI, calculatePercentageChange } from '../../utils/inflationCalculator';

export const WageEntriesTable: React.FC = () => {
  const dispatch = useAppDispatch();
  const entries = useAppSelector(state => state.wageEntries.entries);
  const country = useAppSelector(state => state.wageEntries.country);
  const currency = useAppSelector(state => state.wageEntries.currency);
  const entryMode = useAppSelector(state => state.wageEntries.entryMode);
  const calculationType = useAppSelector(state => state.wageEntries.tableSettings.cpiCalculationType);
  const cpiData = useAppSelector(state => selectCPIDataByCountry(state, country));
  const countryInfo = COUNTRIES[country];
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Fetch CPI data if not already loaded
  useEffect(() => {
    if (!cpiData && entries.length > 0) {
      dispatch(fetchCPIData({ country }));
    }
  }, [country, cpiData, entries.length, dispatch]);

  const handleAddEntry = () => {
    dispatch(openWageEntryModal());
  };

  const handleLoadSampleData = () => {
    const sampleData = [...SAMPLE_DATA[country]]; // Create mutable copy
    dispatch(loadSampleData(sampleData));
    toast.success(SUCCESS_MESSAGES.SAMPLE_DATA_LOADED);
  };

  const handleDeleteEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the entry from ${format(new Date(entry.date), DATE_FORMATS.DISPLAY)}?`
    );
    
    if (confirmed) {
      dispatch(deleteWageEntry(id));
      toast.success(SUCCESS_MESSAGES.ENTRY_DELETED);
    }
  };
  
  const handleClearAll = () => {
    dispatch(clearAllEntries());
    setShowClearConfirm(false);
    toast.success(SUCCESS_MESSAGES.ALL_ENTRIES_CLEARED);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold flex items-center space-x-2">
            <i className="fas fa-table text-primary"></i>
            <span>Wage Entries</span>
            <span className="text-sm font-normal text-muted">
              ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
            </span>
          </h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {entries.length > 0 && (
            <>
              {entryMode === 'annual' && (
                <button 
                  onClick={() => setShowSettings(true)}
                  className="btn-ghost px-3 py-2 rounded-lg flex items-center space-x-2 text-sm"
                  title="Table settings"
                >
                  <i className="fas fa-cog"></i>
                  <span className="hidden sm:inline">Settings</span>
                </button>
              )}
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="btn-ghost px-3 py-2 rounded-lg flex items-center space-x-2 text-sm"
                title="Clear all entries"
              >
                <i className="fas fa-trash-alt"></i>
                <span className="hidden sm:inline">Clear All</span>
              </button>
            </>
          )}
          <button 
            onClick={handleAddEntry}
            className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <i className="fas fa-plus"></i>
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Table or Empty State */}
      {entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted text-sm">
                  Date
                </th>
                <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted text-sm">
                  Label
                </th>
                <th className="text-right py-3 px-2 sm:px-4 font-medium text-muted text-sm">
                  Amount
                </th>
                <th className="text-right py-3 px-2 sm:px-4 font-medium text-muted text-sm hidden sm:table-cell">
                  Today's {currency === 'USD' ? 'Dollars' : currency === 'GBP' ? 'Pounds' : 'CAD'}
                </th>
                <th className="text-right py-3 px-2 sm:px-4 font-medium text-muted text-sm">
                  % Change
                </th>
                <th className="text-center py-3 px-2 sm:px-4 font-medium text-muted text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {entries.map((entry, index) => {
                  // Determine if this is an annual entry
                  const isAnnualEntry = entry.entryType.includes('annual');
                  
                  // Calculate today's value and percentage changes
                  const todaysValue = cpiData 
                    ? adjustToLatestCPI(entry.amount, new Date(entry.date), cpiData, isAnnualEntry, calculationType) 
                    : null;
                  const previousEntry = index > 0 ? entries[index - 1] : undefined;
                  const previousIsAnnual = previousEntry?.entryType.includes('annual') || false;
                  const previousTodaysValue = previousEntry && cpiData 
                    ? adjustToLatestCPI(previousEntry.amount, new Date(previousEntry.date), cpiData, previousIsAnnual, calculationType) 
                    : null;
                  
                  const nominalChange = previousEntry 
                    ? calculatePercentageChange(entry.amount, previousEntry.amount) 
                    : null;
                  const realChange = todaysValue && previousTodaysValue 
                    ? calculatePercentageChange(todaysValue, previousTodaysValue) 
                    : null;
                  
                  return (
                    <EditableTableRow
                      key={entry.id}
                      entry={entry}
                      index={index}
                      entryMode={entryMode}
                      onDelete={() => handleDeleteEntry(entry.id)}
                      formatCurrency={formatCurrency}
                      todaysValue={todaysValue}
                      nominalChange={nominalChange}
                      realChange={realChange}
                      cpiDataLoaded={!!cpiData}
                      previousEntry={previousEntry}
                      cpiData={cpiData}
                      calculationType={calculationType}
                      currency={currency}
                      country={country}
                    />
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      ) : (
        // Empty State
        <motion.div
          className="text-center py-12"
          initial={ANIMATION_VARIANTS.FADE_IN.initial}
          animate={ANIMATION_VARIANTS.FADE_IN.animate}
        >
          <div className="space-y-4">
            <i className="fas fa-inbox text-4xl text-muted"></i>
            <h3 className="text-xl font-semibold text-muted">
              No wage entries yet
            </h3>
            <p className="text-secondary max-w-md mx-auto">
              Start by adding your wage data to see how your purchasing power has changed over time. 
              You'll need at least 2 entries to see results.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <button 
                onClick={handleAddEntry}
                className="btn-primary px-6 py-3 rounded-lg"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Your First Entry
              </button>
              
              <span className="text-muted">or</span>
              
              <button 
                onClick={handleLoadSampleData}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                <i className="fas fa-eye mr-2"></i>
                Load Sample Data
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info text when there are entries but less than 2 */}
      {entries.length === 1 && (
        <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <p className="text-sm text-accent flex items-center">
            <i className="fas fa-info-circle mr-2"></i>
            Add one more entry to see your wage growth analysis
          </p>
        </div>
      )}

      {/* Currency and CPI info */}
      <div className="mt-6 pt-4 border-t border-border space-y-1">
        <p className="text-xs text-muted">
          <i className="fas fa-info-circle mr-1"></i>
          All amounts are in {countryInfo.currency} ({countryInfo.currencySymbol}). 
          Data source: {countryInfo.cpiSource}
        </p>
        {entries.length > 0 && (
          <p className="text-xs text-muted">
            <i className="fas fa-calculator mr-1"></i>
            {entryMode === 'annual' 
              ? `Using ${calculationType === 'annual-average' ? 'annual average' : 'December'} CPI values for inflation calculations`
              : 'Using exact monthly CPI values for inflation calculations'
            }
          </p>
        )}
      </div>
      
      {/* Clear All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
        title="Clear All Entries"
        message="Are you sure you want to delete all wage entries? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
      />
      
      {/* Table Settings Modal */}
      <TableSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};