import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '../../store';
import { openWageEntryModal } from '../../store/slices/uiSlice';
import { deleteWageEntry, loadSampleData, clearAllEntries } from '../../store/slices/wageEntriesSlice';
import { fetchCPIData, selectCPIDataByCountry, selectCPIDateRangeByCountry, selectCPILoading } from '../../store/slices/cpiSlice';
import { COUNTRIES, SAMPLE_DATA, DATE_FORMATS, SUCCESS_MESSAGES, FEATURE_FLAGS } from '../../constants';
import { EditableTableRow } from './EditableTableRow';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TableSettings } from './TableSettings';
import { CSVImportModal } from './CSVImportModal';
import { adjustToLatestCPI, calculatePercentageChange, calculateInflationRate } from '../../utils/inflationCalculator';
import { Tooltip } from '../ui/Tooltip';

export const WageEntriesTable: React.FC = () => {
  const dispatch = useAppDispatch();
  const entries = useAppSelector(state => state.wageEntries.entries);
  const country = useAppSelector(state => state.wageEntries.country);
  const entryMode = useAppSelector(state => state.wageEntries.entryMode);
  const calculationType = useAppSelector(state => state.wageEntries.tableSettings.cpiCalculationType);
  const cpiData = useAppSelector(state => selectCPIDataByCountry(state, country));
  const cpiDateRange = useAppSelector(state => selectCPIDateRangeByCountry(state, country));
  const cpiLoading = useAppSelector(selectCPILoading);
  const countryInfo = COUNTRIES[country];
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (!cpiData && entries.length > 0) {
      dispatch(fetchCPIData({ country }));
    }
  }, [country, cpiData, entries.length, dispatch]);

  const handleAddEntry = () => {
    dispatch(openWageEntryModal());
  };

  const handleLoadSampleData = () => {
    const sampleData = [...SAMPLE_DATA[country]];
    dispatch(loadSampleData(sampleData));
    toast.success(SUCCESS_MESSAGES.SAMPLE_DATA_LOADED);
  };

  const handleDeleteEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const confirmed = window.confirm(
      `Delete entry from ${format(new Date(entry.date), DATE_FORMATS.DISPLAY)}?`
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

  const handleRefreshCPIData = () => {
    dispatch(fetchCPIData({ country, forceRefresh: true }));
    toast.success('Refreshing CPI data...');
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
    return `${countryInfo.currencySymbol}${formatted}`;
  };

  return (
    <div className="card p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2
            className="text-xl font-medium"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Wage History
          </h2>
          {entries.length > 0 && (
            <span className="tag">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {entries.length > 0 && (
            <>
              {entryMode === 'annual' && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn-ghost"
                  title="Settings"
                >
                  <i className="fas fa-sliders-h"></i>
                </button>
              )}
              <button
                onClick={() => setShowClearConfirm(true)}
                className="btn-ghost text-[var(--error)]"
                title="Clear all"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </>
          )}
          {FEATURE_FLAGS.ENABLE_CSV_IMPORT && (
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary"
              title="Import from CSV"
            >
              <i className="fas fa-file-import mr-1.5"></i>
              Import
            </button>
          )}
          <button onClick={handleAddEntry} className="btn-primary">
            Add Entry
          </button>
        </div>
      </div>

      {/* Table or Empty State */}
      {entries.length > 0 ? (
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pl-4 sm:pl-6 w-8"></th>
                <th className="text-left">
                  <Tooltip content="When you earned this wage">Date</Tooltip>
                </th>
                <th className="text-right">
                  <Tooltip content="Original gross pay at the time">Gross Pay</Tooltip>
                </th>
                <th className="text-right">
                  <Tooltip content="Nominal income change from previous entry">Gain/Loss</Tooltip>
                </th>
                <th className="text-right">
                  <Tooltip content="How much prices rose between entries (CPI)">Inflation</Tooltip>
                </th>
                <th className="text-right">
                  <Tooltip content="Your gain/loss adjusted for inflation — did your raise beat rising prices?">Real Gain/Loss</Tooltip>
                </th>
                <th className="text-right pr-4 sm:pr-6">
                  <Tooltip content="What your wage is worth in today's dollars">Today's Value</Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {entries.map((entry, index) => {
                  const isAnnualEntry = entry.entryType.includes('annual');

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
                  const inflationRate = previousEntry && cpiData
                    ? calculateInflationRate(
                        new Date(previousEntry.date),
                        new Date(entry.date),
                        cpiData,
                        isAnnualEntry,
                        calculationType
                      )
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
                      inflationRate={inflationRate}
                      cpiDataLoaded={!!cpiData}
                      previousEntry={previousEntry}
                      cpiData={cpiData}
                      calculationType={calculationType}
                      country={country}
                    />
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      ) : (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-[var(--text-muted)] mb-6">
            Add your wage data to see how your purchasing power has changed.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button onClick={handleAddEntry} className="btn-primary">
              Add First Entry
            </button>
            <span className="text-[var(--text-muted)]">or</span>
            <button onClick={handleLoadSampleData} className="btn-secondary">
              Load Sample Data
            </button>
          </div>
        </motion.div>
      )}

      {/* One entry hint */}
      {entries.length === 1 && (
        <div className="mt-4 p-3 bg-[var(--border-light)] rounded-md">
          <p className="text-sm text-[var(--text-secondary)]">
            Add one more entry to see your wage growth analysis.
          </p>
        </div>
      )}

      {/* Footer info */}
      <div className="mt-6 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            {countryInfo.currency} • {countryInfo.cpiSource}
            {entries.length > 0 && (
              <span>
                {' '}• {entryMode === 'annual'
                  ? `${calculationType === 'annual-average' ? 'Annual average' : 'December'} CPI`
                  : 'Monthly CPI'
                }
              </span>
            )}
            {cpiDateRange?.maxDate && (
              <span> • Data through {format(new Date(cpiDateRange.maxDate + '-01'), 'MMM yyyy')}</span>
            )}
          </p>
          <button
            onClick={handleRefreshCPIData}
            disabled={cpiLoading}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            title="Refresh CPI data (bypass cache)"
          >
            <i className={`fas fa-sync-alt ${cpiLoading ? 'fa-spin' : ''}`}></i>
            <span className="ml-1.5 hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
        title="Clear All Entries"
        message="Delete all wage entries? This cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
      />

      <TableSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {FEATURE_FLAGS.ENABLE_CSV_IMPORT && (
        <CSVImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};
