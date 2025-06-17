import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, parse } from 'date-fns';
import { useAppDispatch } from '../../store';
import { updateWageEntry } from '../../store/slices/wageEntriesSlice';
import { openWageEntryModal } from '../../store/slices/uiSlice';
import { DATE_FORMATS, VALIDATION } from '../../constants';
import type { WageEntry, EntryMode } from '../../types';
import { formatPercentage, getPercentageColorClass } from '../../utils/inflationCalculator';

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
  cpiDataLoaded
}) => {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [editedAmount, setEditedAmount] = useState('');
  const [editedLabel, setEditedLabel] = useState('');
  const [errors, setErrors] = useState<{ date?: string; amount?: string }>({});
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Initialize edit values when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const dateFormat = entryMode === 'annual' ? 'yyyy' : DATE_FORMATS.ISO;
      setEditedDate(format(new Date(entry.date), dateFormat));
      setEditedAmount(entry.amount.toString());
      setEditedLabel(entry.label || '');
      setErrors({});
      
      // Focus on first input
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
    
    // Validate date
    try {
      const dateFormat = entryMode === 'annual' ? 'yyyy' : DATE_FORMATS.ISO;
      const parsedDate = parse(editedDate, dateFormat, new Date());
      
      if (isNaN(parsedDate.getTime())) {
        newErrors.date = 'Invalid date';
      } else {
        const year = parsedDate.getFullYear();
        if (year < VALIDATION.MIN_YEAR || year > VALIDATION.MAX_YEAR) {
          newErrors.date = `Year must be between ${VALIDATION.MIN_YEAR} and ${VALIDATION.MAX_YEAR}`;
        }
      }
    } catch {
      newErrors.date = 'Invalid date format';
    }
    
    // Validate amount
    const amount = parseFloat(editedAmount);
    if (isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (amount > VALIDATION.MAX_WAGE_AMOUNT) {
      newErrors.amount = `Amount too high`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateInputs()) return;
    
    const dateFormat = entryMode === 'annual' ? 'yyyy' : DATE_FORMATS.ISO;
    const parsedDate = parse(editedDate, dateFormat, new Date());
    
    // If annual mode, set to January 1st of that year
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
      <tr className="border-b border-border">
        <td className="py-3 px-2 sm:px-4">
          <input
            ref={dateInputRef}
            type={entryMode === 'annual' ? 'number' : 'date'}
            value={editedDate}
            onChange={(e) => setEditedDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full px-2 py-1 rounded border ${
              errors.date ? 'border-red-500' : 'border-border'
            } bg-background text-primary`}
            placeholder={entryMode === 'annual' ? 'YYYY' : 'YYYY-MM-DD'}
          />
          {errors.date && (
            <p className="text-xs text-red-500 mt-1">{errors.date}</p>
          )}
        </td>
        <td className="py-3 px-2 sm:px-4">
          <input
            type="text"
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 rounded border border-border bg-background text-primary"
            placeholder="Optional label"
          />
        </td>
        <td className="py-3 px-2 sm:px-4">
          <input
            type="number"
            value={editedAmount}
            onChange={(e) => setEditedAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full px-2 py-1 rounded border text-right ${
              errors.amount ? 'border-red-500' : 'border-border'
            } bg-background text-primary`}
            placeholder="0"
            step="0.01"
          />
          {errors.amount && (
            <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
          )}
        </td>
        <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
          {/* Skip today's value column when editing */}
        </td>
        <td className="py-3 px-2 sm:px-4">
          {/* Skip % change column when editing */}
        </td>
        <td className="py-3 px-2 sm:px-4">
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={handleSave}
              className="p-2 rounded hover:bg-surface-hover text-accent transition-colors"
              aria-label="Save changes"
            >
              <i className="fas fa-check"></i>
            </button>
            <button
              onClick={handleCancel}
              className="p-2 rounded hover:bg-surface-hover text-muted transition-colors"
              aria-label="Cancel editing"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <motion.tr
      className="border-b border-border hover:bg-surface-hover transition-colors group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <td className="py-3 px-2 sm:px-4">
        <span className="font-medium">{displayDate}</span>
      </td>
      <td className="py-3 px-2 sm:px-4">
        <span className="text-secondary">
          {entry.label || <span className="text-muted italic">—</span>}
        </span>
      </td>
      <td className="py-3 px-2 sm:px-4 text-right">
        <span className="font-mono font-medium">
          {formatCurrency(entry.amount)}
        </span>
      </td>
      <td className="py-3 px-2 sm:px-4 text-right hidden sm:table-cell">
        {cpiDataLoaded ? (
          <span className="font-mono text-accent" title="Adjusted for inflation to latest available data">
            {todaysValue ? formatCurrency(todaysValue) : '—'}
          </span>
        ) : (
          <span className="text-muted text-sm">...</span>
        )}
      </td>
      <td className="py-3 px-2 sm:px-4 text-right">
        {index > 0 && cpiDataLoaded ? (
          <div className="text-sm">
            <div className={`font-medium ${getPercentageColorClass(nominalChange)}`} title="Nominal wage change">
              {formatPercentage(nominalChange)}
            </div>
            <div className={`text-xs ${getPercentageColorClass(realChange)}`} title="Real wage change (inflation-adjusted)">
              real: {formatPercentage(realChange)}
            </div>
          </div>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="py-3 px-2 sm:px-4">
        <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEditInModal}
            className="p-2 rounded hover:bg-surface-hover text-secondary hover:text-primary transition-colors"
            aria-label="Edit entry"
            title="Edit in modal"
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            onClick={handleEdit}
            className="p-2 rounded hover:bg-surface-hover text-secondary hover:text-primary transition-colors"
            aria-label="Quick edit"
            title="Quick edit inline"
          >
            <i className="fas fa-pen"></i>
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded hover:bg-surface-hover text-secondary hover:text-red-500 transition-colors"
            aria-label="Delete entry"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </motion.tr>
  );
};