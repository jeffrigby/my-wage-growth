import { useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { 
  fetchCPIData, 
  selectCPIDataByCountry, 
  selectCPILoading, 
  selectCPIError,
  selectCPIDateRangeByCountry,
  clearError
} from '../store/slices/cpiSlice';
import type { Country } from '../types';

export const useCPIData = (country: Country) => {
  const dispatch = useAppDispatch();
  
  // Select relevant data from Redux store
  const cpiData = useAppSelector(state => selectCPIDataByCountry(state, country));
  const dateRange = useAppSelector(state => selectCPIDateRangeByCountry(state, country));
  const loading = useAppSelector(selectCPILoading);
  const error = useAppSelector(selectCPIError);
  
  // Fetch CPI data for the country if not already loaded
  useEffect(() => {
    // Only fetch if we don't have data, not loading, and no error
    if (!cpiData && !loading && !error) {
      dispatch(fetchCPIData({ country }));
    }
  }, [country, cpiData, loading, error, dispatch]);
  
  // Retry function for failed requests
  const retry = useCallback(() => {
    dispatch(clearError());
    dispatch(fetchCPIData({ country }));
  }, [country, dispatch]);

  // Force refresh - bypasses all caches (browser and CloudFront)
  const forceRefresh = useCallback(() => {
    dispatch(clearError());
    dispatch(fetchCPIData({ country, forceRefresh: true }));
  }, [country, dispatch]);
  
  // Check if data is stale (older than 24 hours)
  const isStale = useCallback(() => {
    if (!cpiData?.lastUpdated) return true;
    
    const lastUpdated = new Date(cpiData.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceUpdate > 24;
  }, [cpiData]);
  
  // Refresh data if stale
  const refresh = useCallback(() => {
    if (isStale() || error) {
      retry();
    }
  }, [isStale, error, retry]);
  
  return {
    cpiData,
    dateRange,
    loading,
    error,
    retry,
    refresh,
    forceRefresh,
    isStale: isStale(),
    hasData: !!cpiData && !!cpiData.months && Object.keys(cpiData.months).length > 0
  };
};

// Hook to get CPI data for all countries at once
export const useAllCPIData = () => {
  const dispatch = useAppDispatch();
  const countries: Country[] = ['US', 'CA', 'UK'];
  
  const loading = useAppSelector(selectCPILoading);
  const error = useAppSelector(selectCPIError);
  
  // Get data for all countries
  const dataByCountry = {
    US: useAppSelector(state => selectCPIDataByCountry(state, 'US')),
    CA: useAppSelector(state => selectCPIDataByCountry(state, 'CA')),
    UK: useAppSelector(state => selectCPIDataByCountry(state, 'UK'))
  };
  
  // Check which countries have data
  const missingCountries = countries.filter(country => !dataByCountry[country]);
  
  // Fetch missing data
  useEffect(() => {
    // Only fetch if not loading and no error
    if (!loading && !error && missingCountries.length > 0) {
      // Fetch data for each missing country
      missingCountries.forEach(country => {
        dispatch(fetchCPIData({ country }));
      });
    }
  }, [missingCountries.length, loading, error, dispatch]);
  
  const retry = useCallback(() => {
    dispatch(clearError());
    countries.forEach(country => {
      if (!dataByCountry[country]) {
        dispatch(fetchCPIData({ country }));
      }
    });
  }, [dispatch, dataByCountry, countries]);
  
  return {
    dataByCountry,
    loading,
    error,
    retry,
    allLoaded: missingCountries.length === 0,
    loadedCount: countries.length - missingCountries.length,
    totalCount: countries.length
  };
};