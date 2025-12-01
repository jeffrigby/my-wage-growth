import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, parse } from 'date-fns';
import { useAppDispatch } from '../../store';
import { updateWageEntry } from '../../store/slices/wageEntriesSlice';
import { openWageEntryModal } from '../../store/slices/uiSlice';
import { DATE_FORMATS, VALIDATION } from '../../constants';
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
  cpiDataLoaded: boolean;
  previousEntry?: WageEntry;
  cpiData: CPIData | null;
  calculationType: TableSettings['cpiCalculationType'];
  currency: string;
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
  cpiDataLoaded,
  previousEntry,
  cpiData,
  calculationType,
  currency,
  country
}) => {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [showCalculations, setShowCalculations] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [editedAmount, setEditedAmount] = useState('');
  const [editedLabel, setEditedLabel] = useState('');
  const [errors, setErrors] = useState<{ date?: string; amount?: string }>({});

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      const dateFormat = entryMode === 'annual' ? 'yyyy' : DATE_FORMATS.ISO;
      setEditedDate(format(new Date(entry.date), dateFormat));
      setEditedAmount(entry.amount.toString());
      setEditedLabel(entry.label || '');
      setErrors({});

      setTimeout(() => dateInputRef.current?.focus(), 100);
    }
  }, [isEditing, entry, entryMode]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleEditInModal = () => {
    dispatch(openWageEntryModal(entry.id));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
  };

  const validateInputs = (): boolean => {
    const newErrors: { date?: string; amount?: string } = {};

    try {
      const dateFormat = entryMode === 'annual' ? 'yyyy' : DATE_FORMATS.ISO;
      const parsedDate = parse(editedDate, dateFormat, new Date());

      if (isNaN(parsedDate.getTime())) {
        newErrors.date = 'Invalid';
      } else {
        const year = parsedDate.getFullYear();
        if (year < VALIDATION.MIN_YEAR || year > VALIDATION.MAX_YEAR) {
          newErrors.date = `${VALIDATION.MIN_YEAR}-${VALIDATION.MAX_YEAR}`;
        }
      }
    } catch {
      newErrors.date = 'Invalid';
    }

    const amount = parseFloat(editedAmount);
    if (isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Invalid';
    } else if (amount > VALIDATION.MAX_WAGE_AMOUNT) {
      newErrors.amount = 'Too high';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateInputs()) return;

    const dateFormat = entryMode === 'annual' ? 'yyyy' : DATE_FORMATS.ISO;
    const parsedDate = parse(editedDate, dateFormat, new Date());

    if (entryMode === 'annual') {
      parsedDate.setMonth(0, 1);
    }

    dispatch(updateWageEntry({
      id: entry.id,
      updates: {
        date: parsedDate,
        amount: parseFloat(editedAmount),
        label: editedLabel.trim() || undefined
      }
    }));

    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayDate = entryMode === 'annual'
    ? format(new Date(entry.date), DATE_FORMATS.DISPLAY_YEAR_ONLY)
    : format(new Date(entry.date), DATE_FORMATS.DISPLAY);

  if (isEditing) {
    return (
      <tr>
        <td className="pl-6">
          <input
            ref={dateInputRef}
            type={entryMode === 'annual' ? 'number' : 'date'}
            value={editedDate}
            onChange={(e) => setEditedDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-28 px-2 py-1.5 text-sm ${errors.date ? 'border-[var(--error)]' : ''}`}
            placeholder={entryMode === 'annual' ? 'YYYY' : ''}
          />
        </td>
        <td>
          <input
            type="text"
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1.5 text-sm"
            placeholder="Label"
          />
        </td>
        <td>
          <input
            type="number"
            value={editedAmount}
            onChange={(e) => setEditedAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-28 px-2 py-1.5 text-sm text-right ${errors.amount ? 'border-[var(--error)]' : ''}`}
            placeholder="0"
            step="0.01"
          />
        </td>
        <td className="hidden sm:table-cell" />
        <td />
        <td className="pr-6">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={handleSave}
              className="p-1.5 rounded hover:bg-[var(--accent-light)] text-[var(--accent)]"
              aria-label="Save"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded hover:bg-[var(--border-light)] text-[var(--text-muted)]"
              aria-label="Cancel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <motion.tr
        className="group"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
      >
        <td className="pl-6 font-medium">{displayDate}</td>
        <td className="text-[var(--text-secondary)]">
          {entry.label || <span className="text-[var(--text-muted)]">—</span>}
        </td>
        <td className="text-right font-medium tabular-nums">
          {formatCurrency(entry.amount)}
        </td>
        <td className="text-right hidden sm:table-cell">
          {cpiDataLoaded ? (
            <span className="text-[var(--accent)] tabular-nums">
              {todaysValue ? formatCurrency(todaysValue) : '—'}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">...</span>
          )}
        </td>
        <td className="text-right">
          {index > 0 && cpiDataLoaded ? (
            <div>
              <div className={`font-medium tabular-nums ${getPercentageColorClass(nominalChange)}`}>
                {formatPercentage(nominalChange)}
              </div>
              <div className={`text-xs tabular-nums ${getPercentageColorClass(realChange)}`}>
                real: {formatPercentage(realChange)}
              </div>
            </div>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </td>
        <td className="pr-6">
          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowCalculations(true)}
              className="p-1.5 rounded hover:bg-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Details"
              title="Show details"
              disabled={!cpiDataLoaded}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </button>
            <button
              onClick={handleEditInModal}
              className="p-1.5 rounded hover:bg-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Edit"
              title="Edit"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={handleEdit}
              className="p-1.5 rounded hover:bg-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Quick edit"
              title="Quick edit"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-[var(--primary-light)] text-[var(--text-muted)] hover:text-[var(--error)]"
              aria-label="Delete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </td>
      </motion.tr>

      <CalculationDetails
        isOpen={showCalculations}
        onClose={() => setShowCalculations(false)}
        entry={entry}
        previousEntry={previousEntry}
        cpiData={cpiData}
        calculationType={calculationType}
        currency={currency}
        country={country}
      />
    </>
  );
};
