import React, { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '../../store';
import { importEntries, setEntryMode } from '../../store/slices/wageEntriesSlice';
import { Modal } from '../ui/Modal';
import { COUNTRIES, VALIDATION } from '../../constants';
import {
  parseCSV,
  checkEntryModeConflict,
  convertToWageEntries,
  generateTemplateCSV,
  downloadCSV,
  type ParseResult,
  type ParsedRow
} from '../../utils/csvParser';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const entries = useAppSelector(state => state.wageEntries.entries);
  const country = useAppSelector(state => state.wageEntries.country);
  const entryMode = useAppSelector(state => state.wageEntries.entryMode);
  const countryInfo = COUNTRIES[country];

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasExistingEntries = entries.length > 0;
  const modeConflict = parseResult?.detectedMode
    ? checkEntryModeConflict(parseResult.detectedMode, entryMode, hasExistingEntries)
    : null;

  const remainingSlots = VALIDATION.MAX_ENTRIES - entries.length;
  const importableCount = parseResult
    ? Math.min(parseResult.validCount, remainingSlots)
    : 0;
  const wouldExceedLimit = parseResult && parseResult.validCount > remainingSlots;

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSV(content);
      setParseResult(result);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setParseResult(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFile(file);
    } else {
      toast.error('Please drop a CSV file');
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = (mode: 'annual' | 'paycheck') => {
    const content = generateTemplateCSV(mode);
    const filename = mode === 'annual' ? 'wage-template-annual.csv' : 'wage-template-paycheck.csv';
    downloadCSV(content, filename);
    toast.success('Template downloaded');
  };

  const handleImport = () => {
    if (!parseResult || modeConflict || parseResult.detectedMode === 'mixed') {
      return;
    }

    const detectedMode = parseResult.detectedMode as 'annual' | 'paycheck';

    try {
      const entriesToImport = convertToWageEntries(parseResult.rows, detectedMode);

      // Limit to remaining slots
      const limitedEntries = entriesToImport.slice(0, remainingSlots);

      // Set entry mode if no existing entries
      if (!hasExistingEntries) {
        dispatch(setEntryMode(detectedMode));
      }

      dispatch(importEntries(limitedEntries));

      toast.success(`Imported ${limitedEntries.length} wage ${limitedEntries.length === 1 ? 'entry' : 'entries'}`);
      handleClose();
    } catch {
      toast.error('Failed to import entries');
    }
  };

  const handleClose = () => {
    setParseResult(null);
    setFileName(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleReset = () => {
    setParseResult(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatAmount = (amount: number) => {
    return `${countryInfo.currencySymbol}${amount.toLocaleString()}`;
  };

  const getModeLabel = (mode: 'annual' | 'paycheck' | 'mixed' | null) => {
    if (mode === 'annual') return 'Annual salary entries';
    if (mode === 'paycheck') return 'Paycheck entries';
    if (mode === 'mixed') return 'Mixed date formats (invalid)';
    return 'Unknown';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Wage Data from CSV"
      className="max-w-lg"
    >
      <div className="p-6 space-y-5">
        {/* Template Downloads */}
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-secondary)]">
            Download a template to see the expected format:
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDownloadTemplate('annual')}
              className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Annual Template
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('paycheck')}
              className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Paycheck Template
            </button>
          </div>
        </div>

        {/* File Upload Zone */}
        {!parseResult ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                : 'border-[var(--border)] hover:border-[var(--text-muted)]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <svg className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-[var(--text-secondary)] mb-2">
              Drag and drop a CSV file here
            </p>
            <button
              type="button"
              onClick={handleBrowseClick}
              className="btn-primary text-sm py-1.5 px-4"
            >
              Browse Files
            </button>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              CSV with columns: date, amount, label (optional)
            </p>
          </div>
        ) : (
          /* Preview Section */
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center justify-between bg-[var(--background-secondary)] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {parseResult.validCount} valid, {parseResult.errorCount} with errors
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Change file
              </button>
            </div>

            {/* Detected Mode */}
            {parseResult.detectedMode && (
              <p className="text-sm text-[var(--text-secondary)]">
                Detected: <span className="font-medium">{getModeLabel(parseResult.detectedMode)}</span>
              </p>
            )}

            {/* Global Errors */}
            {parseResult.globalErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                {parseResult.globalErrors.map((error, i) => (
                  <p key={i} className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ))}
              </div>
            )}

            {/* Mode Conflict Warning */}
            {modeConflict && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-600 dark:text-amber-400">{modeConflict}</p>
              </div>
            )}

            {/* Limit Warning */}
            {wouldExceedLimit && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Only {remainingSlots} {remainingSlots === 1 ? 'entry' : 'entries'} can be imported (max {VALIDATION.MAX_ENTRIES} total).
                </p>
              </div>
            )}

            {/* Preview Table */}
            {parseResult.rows.length > 0 && (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--background-secondary)] sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-[var(--text-secondary)]">#</th>
                        <th className="text-left px-3 py-2 font-medium text-[var(--text-secondary)]">Date</th>
                        <th className="text-right px-3 py-2 font-medium text-[var(--text-secondary)]">Amount</th>
                        <th className="text-left px-3 py-2 font-medium text-[var(--text-secondary)]">Label</th>
                        <th className="text-center px-3 py-2 font-medium text-[var(--text-secondary)]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.rows.map((row: ParsedRow) => (
                        <tr
                          key={row.rowNumber}
                          className={`border-t border-[var(--border)] ${
                            !row.isValid ? 'bg-red-50 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-[var(--text-muted)]">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.date || '-'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.amount > 0 ? formatAmount(row.amount) : '-'}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-muted)] truncate max-w-24">
                            {row.label || '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center text-green-600 dark:text-green-400">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center text-red-500"
                                title={row.errors.join(', ')}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Row Errors */}
            {parseResult.rows.some(r => !r.isValid) && (
              <div className="text-xs text-[var(--text-muted)] space-y-1">
                {parseResult.rows
                  .filter(r => !r.isValid)
                  .slice(0, 3)
                  .map(row => (
                    <p key={row.rowNumber}>
                      Row {row.rowNumber}: {row.errors.join(', ')}
                    </p>
                  ))}
                {parseResult.rows.filter(r => !r.isValid).length > 3 && (
                  <p>...and {parseResult.rows.filter(r => !r.isValid).length - 3} more errors</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {parseResult ? (
            <>
              <button
                type="button"
                onClick={handleImport}
                disabled={
                  importableCount === 0 ||
                  !!modeConflict ||
                  parseResult.detectedMode === 'mixed'
                }
                className="flex-1 btn-primary py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {importableCount} {importableCount === 1 ? 'Entry' : 'Entries'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 btn-secondary py-2.5"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 btn-secondary py-2.5"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
