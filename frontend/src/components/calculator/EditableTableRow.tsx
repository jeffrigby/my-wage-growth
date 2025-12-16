import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useAppDispatch } from '../../store';
import { openWageEntryModal } from '../../store/slices/uiSlice';
import { DATE_FORMATS } from '../../constants';
import type { WageEntry, EntryMode, CPIData, TableSettings } from '../../types';
import { formatPercentage, getPercentageColorClass } from '../../utils/inflationCalculator';
import { CalculationDetails } from './CalculationDetails';

interface EditableTableRowProps {
  entry: WageEntry;
  index: number;
  entryMode: EntryMode;
  onDelete: () => void;
  formatCurrency: (amount: number) => string;
  todaysValue: number | null;
  nominalChange: number | null;
  realChange: number | null;
  inflationRate: number | null;
  cpiDataLoaded: boolean;
  previousEntry?: WageEntry;
  cpiData: CPIData | null;
  calculationType: TableSettings['cpiCalculationType'];
  country: string;
}

export const EditableTableRow: React.FC<EditableTableRowProps> = ({
  entry,
  index,
  entryMode,
  onDelete,
  formatCurrency,
  todaysValue,
  nominalChange,
  realChange,
  inflationRate,
  cpiDataLoaded,
  previousEntry,
  cpiData,
  calculationType,
  country
}) => {
  const dispatch = useAppDispatch();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCalculations, setShowCalculations] = useState(false);

  const rowRef = useRef<HTMLTableRowElement>(null);

  // Close expanded row when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && rowRef.current && !rowRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // Close expanded row on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isExpanded]);

  const handleRowClick = useCallback((e: React.MouseEvent) => {
    // Don't toggle if clicking on an interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }
    setIsExpanded(prev => !prev);
  }, []);

  const handleRowKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(prev => !prev);
    }
  }, []);

  const handleEditInModal = () => {
    dispatch(openWageEntryModal(entry.id));
    setIsExpanded(false);
  };

  const handleShowDetails = () => {
    setShowCalculations(true);
    setIsExpanded(false);
  };

  const handleDelete = () => {
    onDelete();
    setIsExpanded(false);
  };

  const displayDate = entryMode === 'annual'
    ? format(new Date(entry.date), DATE_FORMATS.DISPLAY_YEAR_ONLY)
    : format(new Date(entry.date), DATE_FORMATS.DISPLAY);

  return (
    <>
      <motion.tr
        ref={rowRef}
        className={`group cursor-pointer transition-colors duration-150 ${
          isExpanded
            ? 'bg-[var(--primary-light)]'
            : 'hover:bg-[var(--border-light)]'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${entry.label || displayDate} - ${formatCurrency(entry.amount)}. Click to ${isExpanded ? 'collapse' : 'expand'} actions.`}
      >
        <td className="pl-4 sm:pl-6 w-8">
          <motion.div
            className="text-[var(--text-muted)]"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </td>
        <td className="font-medium">
          {entry.label ? (
            <TooltipPrimitive.Provider delayDuration={200}>
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <span className="inline-flex items-center cursor-help">
                    {displayDate}
                    <svg className="ml-1.5 w-3.5 h-3.5 text-[var(--text-muted)] opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </span>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content
                    className="z-[9999] px-3 py-2 text-xs font-normal bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg shadow-lg select-none animate-in fade-in-0 zoom-in-95"
                    sideOffset={5}
                  >
                    {entry.label}
                    <TooltipPrimitive.Arrow className="fill-[var(--surface-elevated)]" />
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            </TooltipPrimitive.Provider>
          ) : (
            displayDate
          )}
        </td>
        <td className="text-right font-medium tabular-nums">
          {formatCurrency(entry.amount)}
        </td>
        {/* Change column (nominal change) */}
        <td className="text-right">
          {index > 0 && cpiDataLoaded ? (
            <span className={`font-medium tabular-nums ${getPercentageColorClass(nominalChange)}`}>
              {formatPercentage(nominalChange)}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </td>
        {/* Inflation column */}
        <td className="text-right">
          {index > 0 && cpiDataLoaded ? (
            <span className="tabular-nums text-[var(--text-secondary)]">
              {formatPercentage(inflationRate)}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </td>
        {/* Real change column */}
        <td className="text-right">
          {index > 0 && cpiDataLoaded && realChange !== null ? (
            <span className={`font-medium tabular-nums ${getPercentageColorClass(realChange)}`}>
              {formatPercentage(realChange)}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </td>
        {/* Today's Value column */}
        <td className="text-right pr-4 sm:pr-6">
          {cpiDataLoaded ? (
            <span className="text-[var(--accent)] tabular-nums">
              {todaysValue ? formatCurrency(todaysValue) : '—'}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">...</span>
          )}
        </td>
      </motion.tr>

      {/* Expanded actions row */}
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <td
              colSpan={7}
              className="bg-[var(--primary-light)] border-b border-[var(--border)]"
              style={{ padding: 0 }}
            >
              <motion.div
                className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, delay: 0.05 }}
              >
                {cpiDataLoaded && (
                  <button
                    onClick={handleShowDetails}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    Details
                  </button>
                )}
                <button
                  onClick={handleEditInModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-md transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                <div className="w-px h-5 bg-[var(--border)] mx-1" />
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--error)] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>

      <CalculationDetails
        isOpen={showCalculations}
        onClose={() => setShowCalculations(false)}
        entry={entry}
        previousEntry={previousEntry}
        cpiData={cpiData}
        calculationType={calculationType}
        country={country}
      />
    </>
  );
};
