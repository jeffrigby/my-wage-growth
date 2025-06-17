import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '../../store';
import { addWageEntry, updateWageEntry, setEntryMode } from '../../store/slices/wageEntriesSlice';
import { closeWageEntryModal } from '../../store/slices/uiSlice';
import { selectCPIDateRangeByCountry } from '../../store/slices/cpiSlice';
import { Modal } from '../ui/Modal';
import { COUNTRIES, ENTRY_MODE_OPTIONS, VALIDATION, ERROR_MESSAGES, DATE_FORMATS, SUCCESS_MESSAGES } from '../../constants';
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
  
  // Check if entry mode is locked due to existing entries
  const hasExistingEntries = entries.length > 0;
  const entryModeLocked = hasExistingEntries && !editingEntry;
  
  // Form state
  const [entryMode, setLocalEntryMode] = useState<EntryMode>(globalEntryMode);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState<{ date?: string; amount?: string; general?: string }>({});
  const [showPreTaxHelp, setShowPreTaxHelp] = useState(false);
  
  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingEntry) {
        // Editing existing entry
        setLocalEntryMode(editingEntry.entryType.includes('annual') ? 'annual' : 'paycheck');
        const dateFormat = editingEntry.entryType.includes('annual') 
          ? 'yyyy' 
          : DATE_FORMATS.ISO;
        setDate(format(new Date(editingEntry.date), dateFormat));
        setAmount(editingEntry.amount.toString());
        setLabel(editingEntry.label || '');
      } else {
        // New entry
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
    
    // Validate date
    if (!date) {
      newErrors.date = 'Date is required';
    } else {
      const year = entryMode === 'annual' 
        ? parseInt(date) 
        : new Date(date).getFullYear();
        
      // Check against CPI data availability - only check minimum
      if (dateRange) {
        if (year < dateRange.minYear) {
          newErrors.date = `CPI data only available from ${dateRange.minYear}`;
        }
      } else {
        // Fallback to hardcoded validation if CPI data not loaded
        if (isNaN(year) || year < VALIDATION.MIN_YEAR) {
          newErrors.date = `Year must be ${VALIDATION.MIN_YEAR} or later`;
        }
      }
      
      // For paycheck mode, validate minimum date
      if (entryMode === 'paycheck' && dateRange && !newErrors.date) {
        const dateStr = format(new Date(date), 'yyyy-MM');
        if (dateStr < dateRange.minDate) {
          const [year, month] = dateRange.minDate.split('-');
          const minDateFormatted = format(new Date(parseInt(year), parseInt(month) - 1), 'MMM yyyy');
          newErrors.date = `CPI data available from ${minDateFormatted}`;
        }
      }
    }
    
    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum)) {
      newErrors.amount = 'Amount is required';
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
    
    // Parse date based on entry mode
    let entryDate: Date;
    if (entryMode === 'annual') {
      entryDate = new Date(parseInt(date), 0, 1); // January 1st of the year
    } else {
      entryDate = new Date(date);
    }
    
    const entryData = {
      date: entryDate,
      amount: parseFloat(amount),
      label: label.trim() || undefined
    };
    
    // Update global entry mode if it changed
    if (entryMode !== globalEntryMode) {
      dispatch(setEntryMode(entryMode));
    }
    
    if (editingEntry) {
      dispatch(updateWageEntry({
        id: editingEntry.id,
        updates: entryData
      }));
      toast.success(SUCCESS_MESSAGES.ENTRY_UPDATED);
    } else {
      dispatch(addWageEntry(entryData));
      toast.success(SUCCESS_MESSAGES.ENTRY_ADDED);
    }
    
    handleClose();
  };
  
  const handleEntryModeChange = (mode: EntryMode) => {
    setLocalEntryMode(mode);
    // Clear date when switching modes
    setDate('');
    setErrors({});
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingEntry ? 'Edit Wage Entry' : 'Add Wage Entry'}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Entry Mode Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-secondary">Entry Type</label>
            {entryModeLocked && (
              <span className="text-xs text-muted flex items-center">
                <i className="fas fa-lock mr-1"></i>
                Locked to match existing entries
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ENTRY_MODE_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => !entryModeLocked && handleEntryModeChange(option.value as EntryMode)}
                disabled={entryModeLocked}
                className={`p-3 rounded-lg border-2 transition-all ${
                  entryModeLocked ? 'opacity-60 cursor-not-allowed' : ''
                } ${
                  entryMode === option.value
                    ? 'border-primary bg-surface-elevated ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : entryModeLocked 
                      ? 'border-border bg-surface'
                      : 'border-border hover:border-primary/50 hover:bg-surface-hover bg-surface'
                }`}
              >
                <i className={`fas ${option.icon} text-lg mb-1 ${
                  entryMode === option.value ? 'text-primary' : ''
                }`}></i>
                <div className={`font-medium ${
                  entryMode === option.value ? 'text-primary' : ''
                }`}>{option.label}</div>
                <div className={`text-xs mt-1 ${
                  entryMode === option.value ? 'text-primary/80' : 'text-muted'
                }`}>{option.description}</div>
              </button>
            ))}
          </div>
          {entryModeLocked && (
            <div className="mt-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-xs text-accent flex items-start">
                <i className="fas fa-info-circle mr-1 mt-0.5"></i>
                <span>
                  Entry type is set to <strong>{entryMode === 'annual' ? 'Annual' : 'Paycheck'}</strong> mode
                  to maintain consistency with your existing data. To switch modes, 
                  clear all entries first using the "Clear All" button in the wage entries table.
                </span>
              </p>
            </div>
          )}
        </div>
        
        {/* Date Input */}
        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-medium text-secondary">
            {entryMode === 'annual' ? 'Year' : 'Date'}
          </label>
          <input
            id="date"
            type={entryMode === 'annual' ? 'number' : 'date'}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.date ? 'border-red-500' : 'border-border'
            } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
            placeholder={entryMode === 'annual' ? 'YYYY' : ''}
            min={entryMode === 'annual' 
              ? (dateRange?.minYear || VALIDATION.MIN_YEAR)
              : dateRange ? `${dateRange.minDate}-01` : undefined
            }
          />
          {errors.date && (
            <p className="text-sm text-red-500">{errors.date}</p>
          )}
          {dateRange && !errors.date && (
            <div className="space-y-1">
              <p className="text-xs text-muted">
                Latest CPI data: {(() => {
                  const [year, month] = dateRange.maxDate.split('-');
                  return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
                })()}
              </p>
              {date && (
                (() => {
                  const selectedYear = entryMode === 'annual' 
                    ? parseInt(date) 
                    : new Date(date).getFullYear();
                  const selectedMonth = entryMode === 'paycheck' 
                    ? format(new Date(date), 'yyyy-MM')
                    : null;
                  
                  if (selectedYear > dateRange.maxYear || 
                      (selectedMonth && selectedMonth > dateRange.maxDate)) {
                    return (
                      <p className="text-xs text-accent flex items-center">
                        <i className="fas fa-info-circle mr-1"></i>
                        Future date entered - will use latest available CPI data
                      </p>
                    );
                  }
                  return null;
                })()
              )}
            </div>
          )}
        </div>
        
        {/* Amount Input */}
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium text-secondary">
            Amount ({countryInfo.currencySymbol})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              {countryInfo.currencySymbol}
            </span>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full pl-8 pr-4 py-2 rounded-lg border ${
                errors.amount ? 'border-red-500' : 'border-border'
              } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              placeholder="0"
              step="0.01"
              min="0.01"
              max={VALIDATION.MAX_WAGE_AMOUNT}
            />
          </div>
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount}</p>
          )}
          
          {/* Enhanced Pre-Tax Wage Guidance */}
          <div className="mt-3 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <i className="fas fa-info-circle text-accent mt-0.5"></i>
              <div className="flex-1">
                <p className="text-sm font-medium text-accent mb-1">
                  Use Pre-Tax {entryMode === 'annual' ? 'Annual Salary' : 'Paycheck Amount'}
                </p>
                <p className="text-xs text-secondary mb-2">
                  This ensures accurate comparisons across different years and tax situations.
                </p>
                
                <button
                  type="button"
                  onClick={() => setShowPreTaxHelp(!showPreTaxHelp)}
                  className="text-xs text-accent hover:text-accent-hover underline flex items-center space-x-1"
                >
                  <span>{showPreTaxHelp ? 'Hide' : 'Show'} where to find this</span>
                  <i className={`fas fa-chevron-${showPreTaxHelp ? 'up' : 'down'} text-xxs`}></i>
                </button>
                
                <AnimatePresence>
                  {showPreTaxHelp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-accent/20 space-y-2 text-xs text-secondary">
                        {entryMode === 'annual' ? (
                          <>
                            <p className="font-medium">Where to find your annual pre-tax salary:</p>
                            <ul className="space-y-1 ml-4">
                              <li>• <strong>W-2 Form:</strong> Look for "Gross Pay" (not Box 1, which is after deductions)</li>
                              <li>• <strong>Year-end pay stub:</strong> Find "YTD Gross Pay" or "Total Earnings"</li>
                              <li>• <strong>Offer letter:</strong> Your base salary before any deductions</li>
                              <li>• <strong>HR system:</strong> Annual gross salary or base compensation</li>
                            </ul>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Where to find your pre-tax paycheck amount:</p>
                            <ul className="space-y-1 ml-4">
                              <li>• <strong>Pay stub:</strong> Look for "Gross Pay" or "Total Earnings"</li>
                              <li>• <strong>Before deductions:</strong> The amount before taxes, insurance, 401k</li>
                              <li>• <strong>Online portal:</strong> Employee self-service usually shows gross pay</li>
                              <li>• <strong>Not your take-home:</strong> Use the larger amount before deductions</li>
                            </ul>
                          </>
                        )}
                        <p className="mt-2 italic">
                          <i className="fas fa-lightbulb text-accent mr-1"></i>
                          Using pre-tax amounts allows for accurate inflation-adjusted comparisons
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        
        {/* Label Input */}
        <div className="space-y-2">
          <label htmlFor="label" className="text-sm font-medium text-secondary">
            Label (Optional)
          </label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={entryMode === 'annual' 
              ? "e.g., '2023 Salary', 'Starting salary', 'After promotion'"
              : "e.g., 'Jan 15 paycheck', 'Bonus payment', 'Final check'"
            }
            maxLength={50}
          />
        </div>
        
        {/* Error message */}
        {errors.general && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{errors.general}</p>
          </div>
        )}
        
        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 btn-primary py-2 rounded-lg"
          >
            <i className="fas fa-save mr-2"></i>
            {editingEntry ? 'Update Entry' : 'Add Entry'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 btn-secondary py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};