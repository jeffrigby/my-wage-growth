import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useAppSelector, useAppDispatch } from '../../store';
import { openWageEntryModal } from '../../store/slices/uiSlice';
import { deleteWageEntry, loadSampleData } from '../../store/slices/wageEntriesSlice';
import { ANIMATION_VARIANTS, COUNTRIES, SAMPLE_DATA, DATE_FORMATS } from '../../constants';
import { EditableTableRow } from './EditableTableRow';

export const WageEntriesTable: React.FC = () => {
  const dispatch = useAppDispatch();
  const entries = useAppSelector(state => state.wageEntries.entries);
  const country = useAppSelector(state => state.wageEntries.country);
  const currency = useAppSelector(state => state.wageEntries.currency);
  const entryMode = useAppSelector(state => state.wageEntries.entryMode);
  const countryInfo = COUNTRIES[country];

  const handleAddEntry = () => {
    dispatch(openWageEntryModal());
  };

  const handleLoadSampleData = () => {
    const sampleData = [...SAMPLE_DATA[country]]; // Create mutable copy
    dispatch(loadSampleData(sampleData));
  };

  const handleDeleteEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the entry from ${format(new Date(entry.date), DATE_FORMATS.DISPLAY)}?`
    );
    
    if (confirmed) {
      dispatch(deleteWageEntry(id));
    }
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
        <h2 className="text-2xl font-semibold flex items-center space-x-2">
          <i className="fas fa-table text-primary"></i>
          <span>Wage Entries</span>
          <span className="text-sm font-normal text-muted">
            ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
          </span>
        </h2>
        
        <button 
          onClick={handleAddEntry}
          className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <i className="fas fa-plus"></i>
          <span>Add Entry</span>
        </button>
      </div>

      {/* Table or Empty State */}
      {entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted text-sm">
                  Date
                </th>
                <th className="text-right py-3 px-4 font-medium text-muted text-sm">
                  Amount
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted text-sm">
                  Label
                </th>
                <th className="text-center py-3 px-4 font-medium text-muted text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {entries.map((entry, index) => (
                  <EditableTableRow
                    key={entry.id}
                    entry={entry}
                    index={index}
                    entryMode={entryMode}
                    onDelete={() => handleDeleteEntry(entry.id)}
                    formatCurrency={formatCurrency}
                  />
                ))}
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

      {/* Currency info */}
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted">
          <i className="fas fa-info-circle mr-1"></i>
          All amounts are in {countryInfo.currency} ({countryInfo.currencySymbol}). 
          Data source: {countryInfo.cpiSource}
        </p>
      </div>
    </div>
  );
};