import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { CPIDataState, CPIData, Country, CPIDateRange } from '../../types';
import { API_CONFIG, CPI_SERIES_MAPPING } from '../../constants';

const initialState: CPIDataState = {
  us: null,
  ca: null,
  uk: null,
  dateRanges: {
    us: null,
    ca: null,
    uk: null
  },
  loading: false,
  error: null,
  lastFetch: null
};

// Helper function to calculate date range from CPI data
const calculateDateRange = (cpiData: CPIData): CPIDateRange => {
  const months = Object.keys(cpiData.months).sort();
  const minDate = months[0];
  const maxDate = months[months.length - 1];
  
  return {
    minDate,
    maxDate,
    minYear: parseInt(minDate.split('-')[0]),
    maxYear: parseInt(maxDate.split('-')[0])
  };
};

// Async thunk for fetching CPI data with optional series support
export const fetchCPIData = createAsyncThunk(
  'cpi/fetchCPIData',
  async ({ country, series, forceRefresh = false }: { country: Country; series?: string; forceRefresh?: boolean }, { rejectWithValue }) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT);

      const countryCode = country.toLowerCase();
      // Default to country-specific CPI series if no series specified
      const seriesName = series || CPI_SERIES_MAPPING[country];
      const url = `${API_CONFIG.CPI_BASE_URL}/${countryCode}/${seriesName}.json`;

      const response = await fetch(url, {
        signal: controller.signal,
        // Bypass browser cache when force refreshing
        cache: forceRefresh ? 'no-store' : 'default',
        headers: {
          'Accept': 'application/json',
          ...(forceRefresh ? {} : { 'Cache-Control': 'max-age=3600' })
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: CPIData = await response.json();
      
      // Validate data structure
      if (!data.months || typeof data.months !== 'object') {
        throw new Error('Invalid CPI data format');
      }
      
      return { country, data, series: seriesName };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return rejectWithValue('Request timeout');
        }
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Unknown error occurred');
    }
  }
);

// Async thunk for fetching multiple countries at once
export const fetchAllCPIData = createAsyncThunk(
  'cpi/fetchAllCPIData',
  async (_, { dispatch }) => {
    const countries: Country[] = ['US', 'CA', 'UK'];
    const promises = countries.map(country => dispatch(fetchCPIData({ country })));
    await Promise.allSettled(promises);
  }
);

const cpiSlice = createSlice({
  name: 'cpi',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    setCPIData: (state, action: PayloadAction<{ country: Country; data: CPIData }>) => {
      const { country, data } = action.payload;
      const countryKey = country.toLowerCase() as 'us' | 'ca' | 'uk';
      state[countryKey] = data;
      state.dateRanges[countryKey] = calculateDateRange(data);
    },
    
    clearCPIData: (state, action: PayloadAction<Country>) => {
      const countryKey = action.payload.toLowerCase() as 'us' | 'ca' | 'uk';
      state[countryKey] = null;
      state.dateRanges[countryKey] = null;
    },
    
    clearAllCPIData: (state) => {
      state.us = null;
      state.ca = null;
      state.uk = null;
      state.dateRanges = {
        us: null,
        ca: null,
        uk: null
      };
      state.error = null;
      state.lastFetch = null;
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Individual country fetch
      .addCase(fetchCPIData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCPIData.fulfilled, (state, action) => {
        const { country, data } = action.payload;
        const countryKey = country.toLowerCase() as 'us' | 'ca' | 'uk';
        
        state.loading = false;
        state[countryKey] = data;
        state.dateRanges[countryKey] = calculateDateRange(data);
        state.lastFetch = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchCPIData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch CPI data';
      })
      
      // All countries fetch
      .addCase(fetchAllCPIData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCPIData.fulfilled, (state) => {
        state.loading = false;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchAllCPIData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch CPI data';
      });
  }
});

export const {
  clearError,
  setCPIData,
  clearCPIData,
  clearAllCPIData
} = cpiSlice.actions;

// Selectors
export const selectCPIDataByCountry = (state: { cpiData: CPIDataState }, country: Country) => {
  const countryKey = country.toLowerCase() as 'us' | 'ca' | 'uk';
  return state.cpiData[countryKey];
};

export const selectCPIDateRangeByCountry = (state: { cpiData: CPIDataState }, country: Country) => {
  const countryKey = country.toLowerCase() as 'us' | 'ca' | 'uk';
  return state.cpiData.dateRanges[countryKey];
};

export const selectLatestCPIDate = (state: { cpiData: CPIDataState }, country: Country) => {
  const cpiData = selectCPIDataByCountry(state, country);
  if (!cpiData) return null;
  
  const months = Object.keys(cpiData.months).sort();
  return months.length > 0 ? months[months.length - 1] : null;
};

export const selectCPIValue = (state: { cpiData: CPIDataState }, country: Country, monthKey: string) => {
  const cpiData = selectCPIDataByCountry(state, country);
  return cpiData?.months[monthKey] || null;
};

export const selectCPILoading = (state: { cpiData: CPIDataState }) => state.cpiData.loading;
export const selectCPIError = (state: { cpiData: CPIDataState }) => state.cpiData.error;
export const selectLastFetch = (state: { cpiData: CPIDataState }) => state.cpiData.lastFetch;

export { cpiSlice };