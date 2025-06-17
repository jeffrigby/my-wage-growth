import React from 'react';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '../../store';
import { updateTableSettings } from '../../store/slices/wageEntriesSlice';
import { Modal } from '../ui/Modal';
import type { TableSettings as TableSettingsType } from '../../types';

interface TableSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TableSettings: React.FC<TableSettingsProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const currentSettings = useAppSelector(state => state.wageEntries.tableSettings);

  const handleChange = (value: TableSettingsType['cpiCalculationType']) => {
    dispatch(updateTableSettings({ cpiCalculationType: value }));
    toast.success(`Switched to ${value === 'annual-average' ? 'Annual Average' : 'December'} CPI`);
    setTimeout(() => onClose(), 300); // Brief delay for user feedback
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Table Settings"
    >
      <div className="p-5 space-y-5">
        {/* CPI Calculation Method */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-secondary">
            CPI Calculation Method for Annual Entries
          </label>
          <div className="space-y-2">
            <label className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="radio"
                name="cpiCalculationType"
                value="annual-average"
                checked={currentSettings.cpiCalculationType === 'annual-average'}
                onChange={() => handleChange('annual-average')}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">Annual Average (Recommended)</div>
                <div className="text-xs text-muted mt-1">
                  Uses the average of all 12 months' CPI values for the year. Most accurate 
                  representation of purchasing power throughout the earning period.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="radio"
                name="cpiCalculationType"
                value="december"
                checked={currentSettings.cpiCalculationType === 'december'}
                onChange={() => handleChange('december')}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">December (End of Year)</div>
                <div className="text-xs text-muted mt-1">
                  Uses the December CPI value, representing the economic conditions at year end. 
                  Simple point-in-time reference for year-end comparisons.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Info note */}
        <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <i className="fas fa-info-circle text-accent mt-0.5 text-sm"></i>
            <div className="text-xs text-secondary">
              <p className="font-medium text-accent mb-0.5">Note</p>
              <p>
                This setting only affects annual salary entries. Paycheck entries always use the exact 
                month's CPI value.
              </p>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};