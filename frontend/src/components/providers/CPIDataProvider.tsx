import React, { useEffect } from 'react';
import { useAppSelector } from '../../store';
import { useCPIData } from '../../hooks/useCPIData';
import { CPILoadingOverlay } from '../ui/CPILoadingOverlay';

interface CPIDataProviderProps {
  children: React.ReactNode;
}

export const CPIDataProvider: React.FC<CPIDataProviderProps> = ({ children }) => {
  // Get the currently selected country
  const selectedCountry = useAppSelector(state => state.wageEntries.country);
  
  // Use the CPI data hook for the selected country
  const { 
    loading, 
    error, 
    retry, 
    hasData
  } = useCPIData(selectedCountry);
  
  // Don't auto-refresh - let the hook handle initial loading
  // This was causing an infinite loop
  
  return (
    <>
      <CPILoadingOverlay
        isLoading={loading && !hasData}
        error={error && !hasData ? error : null}
        onRetry={retry}
      />
      {children}
    </>
  );
};