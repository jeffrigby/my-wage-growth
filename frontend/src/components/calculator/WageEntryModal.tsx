import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '../../store';
import { addWageEntry, updateWageEntry, setEntryMode } from '../../store/slices/wageEntriesSlice';
import { closeWageEntryModal } from '../../store/slices/uiSlice';
import { selectCPIDateRangeByCountry } from '../../store/slices/cpiSlice';
import { Modal } from '../ui/Modal';
import { COUNTRIES, VALIDATION, ERROR_MESSAGES, DATE_FORMATS, SUCCESS_MESSAGES } from '../../constants';
import type { EntryMode } from '../../types';

export const WageEntryModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(state => state.ui.wageEntryModalOpen);
  const editingId = useAppSelector(state => state.ui.editingEntryId);
  const entries = useAppSelector(state => state.wageEntries.entries);
  const country = useAppSelector(state => state.wageEntries.country);
  const globalEntryMode = useAppSelector(state => state.wageEntries.entryMode);
  const dateRange = useAppSelector(state => selectCPIDateRangeByCountry(state, country));

  const countryInfo = COUNTRIES[country];
  const editingEntry = editingId ? entries.find(e => e.id === editingId) : null;

  const hasExistingEntries = entries.length > 0;
  const entryModeLocked = hasExistingEntries && !editingEntry;

  const [entryMode, setLocalEntryMode] = useState<EntryMode>(globalEntryMode);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState<{ date?: string; amount?: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (editingEntry) {
        setLocalEntryMode(editingEntry.entryType.includes('annual') ? 'annual' : 'paycheck');
        const dateFormat = editingEntry.entryType.includes('annual') ? 'yyyy' : DATE_FORMATS.ISO;
        setDate(format(new Date(editingEntry.date), dateFormat));
        setAmount(editingEntry.amount.toString());
        setLabel(editingEntry.label || '');
      } else {
        setLocalEntryMode(globalEntryMode);
        setDate('');
        setAmount('');
        setLabel('');
      }
      setErrors({});
    }
  }, [isOpen, editingEntry, globalEntryMode]);

  const handleClose = () => {
    dispatch(closeWageEntryModal());
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!date) {
      newErrors.date = 'Required';
    } else {
      const year = entryMode === 'annual' ? parseInt(date) : new Date(date).getFullYear();

      if (dateRange) {
        if (year < dateRange.minYear) {
          newErrors.date = `CPI data available from ${dateRange.minYear}`;
        }
      } else if (isNaN(year) || year < VALIDATION.MIN_YEAR) {
        newErrors.date = `Year must be ${VALIDATION.MIN_YEAR} or later`;
      }

      if (entryMode === 'paycheck' && dateRange && !newErrors.date) {
        const dateStr = format(new Date(date), 'yyyy-MM');
        if (dateStr < dateRange.minDate) {
          const [y, m] = dateRange.minDate.split('-');
          const minDateFormatted = format(new Date(parseInt(y), parseInt(m) - 1), 'MMM yyyy');
          newErrors.date = `CPI data available from ${minDateFormatted}`;
        }
      }
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum)) {
      newErrors.amount = 'Required';
    } else if (amountNum < VALIDATION.MIN_WAGE_AMOUNT) {
      newErrors.amount = ERROR_MESSAGES.AMOUNT_TOO_LOW;
    } else if (amountNum > VALIDATION.MAX_WAGE_AMOUNT) {
      newErrors.amount = ERROR_MESSAGES.AMOUNT_TOO_HIGH;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    let entryDate: Date;
    if (entryMode === 'annual') {
      entryDate = new Date(parseInt(date), 0, 1);
    } else {
      entryDate = new Date(date);
    }

    const entryData = {
      date: entryDate,
      amount: parseFloat(amount),
      label: label.trim() || undefined
    };

    if (entryMode !== globalEntryMode) {
      dispatch(setEntryMode(entryMode));
    }

    if (editingEntry) {
      dispatch(updateWageEntry({ id: editingEntry.id, updates: entryData }));
      toast.success(SUCCESS_MESSAGES.ENTRY_UPDATED);
    } else {
      dispatch(addWageEntry(entryData));
      toast.success(SUCCESS_MESSAGES.ENTRY_ADDED);
    }

    handleClose();
  };

  const handleEntryModeChange = (mode: EntryMode) => {
    setLocalEntryMode(mode);
    setDate('');
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingEntry ? 'Edit Entry' : 'Add Entry'}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Entry Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['annual', 'paycheck'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => !entryModeLocked && handleEntryModeChange(mode)}
                disabled={entryModeLocked}
                className={`p-3 rounded-md border text-sm font-medium transition-all ${
                  entryModeLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  entryMode === mode
                    ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                }`}
              >
                {mode === 'annual' ? 'Annual Salary' : 'Paycheck'}
              </button>
            ))}
          </div>
          {entryModeLocked && (
            <p className="text-xs text-[var(--text-muted)]">
              All entries must use the same type. Clear existing entries to switch.
            </p>
          )}
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label htmlFor="date" className="text-sm font-medium text-[var(--text-secondary)]">
            {entryMode === 'annual' ? 'Year' : 'Date'}
          </label>
          <input
            id="date"
            type={entryMode === 'annual' ? 'number' : 'date'}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={errors.date ? 'border-[var(--error)]' : ''}
            placeholder={entryMode === 'annual' ? 'YYYY' : ''}
            min={entryMode === 'annual'
              ? (dateRange?.minYear || VALIDATION.MIN_YEAR)
              : dateRange ? `${dateRange.minDate}-01` : undefined
            }
          />
          {errors.date && (
            <p className="text-xs text-[var(--error)]">{errors.date}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label htmlFor="amount" className="text-sm font-medium text-[var(--text-secondary)]">
            Amount ({countryInfo.currencySymbol})
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {countryInfo.currencySymbol}
            </span>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`!pl-10 ${errors.amount ? 'border-[var(--error)]' : ''}`}
              placeholder="0"
              step="0.01"
              min="0.01"
              max={VALIDATION.MAX_WAGE_AMOUNT}
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-[var(--error)]">{errors.amount}</p>
          )}
          <p className="text-xs text-[var(--text-muted)]">
            Use pre-tax {entryMode === 'annual' ? 'salary' : 'amount'}
          </p>
        </div>

        {/* Label */}
        <div className="space-y-1.5">
          <label htmlFor="label" className="text-sm font-medium text-[var(--text-secondary)]">
            Label <span className="text-[var(--text-muted)]">(optional)</span>
          </label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={entryMode === 'annual' ? 'e.g., Starting salary' : 'e.g., January paycheck'}
            maxLength={50}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 btn-primary py-2.5">
            {editingEntry ? 'Update' : 'Add Entry'}
          </button>
          <button type="button" onClick={handleClose} className="flex-1 btn-secondary py-2.5">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};
