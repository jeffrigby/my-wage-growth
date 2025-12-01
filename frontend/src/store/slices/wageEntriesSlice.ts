import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { 
  WageEntriesState, 
  WageEntry, 
  AddWageEntryPayload, 
  UpdateWageEntryPayload,
  SetCountryPayload,
  EntryMode,
  SampleEntry
} from '../../types';

const initialState: WageEntriesState = {
  entries: [],
  country: 'US',
  currency: 'USD',
  entryMode: 'annual',
  tableSettings: {
    cpiCalculationType: 'annual-average'
  }
};

const wageEntriesSlice = createSlice({
  name: 'wageEntries',
  initialState,
  reducers: {
    addWageEntry: (state, action: PayloadAction<AddWageEntryPayload>) => {
      const { date, amount, label } = action.payload;
      
      // Determine entry type based on current mode
      let entryType: WageEntry['entryType'];
      if (state.entryMode === 'annual') {
        entryType = 'annual-simple'; // Default to simple for now
      } else {
        entryType = 'point-in-time';
      }
      
      const newEntry: WageEntry = {
        id: uuidv4(),
        date: date.toISOString(),
        amount,
        entryType,
        label,
        createdAt: new Date().toISOString()
      };
      
      state.entries.push(newEntry);
      // Sort entries by date
      state.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    
    updateWageEntry: (state, action: PayloadAction<UpdateWageEntryPayload>) => {
      const { id, updates } = action.payload;
      const entryIndex = state.entries.findIndex(entry => entry.id === id);
      
      if (entryIndex !== -1) {
        // Convert date to ISO string if provided
        const processedUpdates: Partial<WageEntry> = {
          ...updates,
          date: updates.date ? updates.date.toISOString() : undefined
        };
        
        state.entries[entryIndex] = {
          ...state.entries[entryIndex],
          ...processedUpdates
        };
        // Re-sort after update if date changed
        if (updates.date) {
          state.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
      }
    },
    
    deleteWageEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter(entry => entry.id !== action.payload);
    },
    
    setCountry: (state, action: PayloadAction<SetCountryPayload>) => {
      const { country, currency } = action.payload;
      state.country = country;
      state.currency = currency;
      // Update currency on all existing entries to match new country
      state.entries = state.entries.map(entry => ({
        ...entry,
        currency
      }));
    },
    
    setEntryMode: (state, action: PayloadAction<EntryMode>) => {
      state.entryMode = action.payload;
      // Update existing entries' entry types
      state.entries.forEach(entry => {
        if (action.payload === 'annual') {
          entry.entryType = 'annual-simple';
        } else {
          entry.entryType = 'point-in-time';
        }
      });
    },
    
    loadSampleData: (state, action: PayloadAction<SampleEntry[]>) => {
      // Sample data is designed for annual entries, so ensure we're in annual mode
      state.entryMode = 'annual';
      
      state.entries = action.payload.map(entry => ({
        id: uuidv4(),
        date: entry.date.toISOString(),
        amount: entry.amount,
        entryType: 'annual-simple',
        label: entry.label,
        createdAt: new Date().toISOString()
      }));
      state.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    
    clearAllEntries: (state) => {
      state.entries = [];
    },
    
    duplicateEntry: (state, action: PayloadAction<string>) => {
      const entryToDuplicate = state.entries.find(entry => entry.id === action.payload);
      if (entryToDuplicate) {
        const duplicatedEntry: WageEntry = {
          ...entryToDuplicate,
          id: uuidv4(),
          label: entryToDuplicate.label ? `${entryToDuplicate.label} (Copy)` : undefined,
          createdAt: new Date().toISOString()
        };
        state.entries.push(duplicatedEntry);
        state.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
    },
    
    // Bulk operations
    updateAllEntryTypes: (state, action: PayloadAction<WageEntry['entryType']>) => {
      state.entries.forEach(entry => {
        entry.entryType = action.payload;
      });
    },
    
    // Import/export helpers
    importEntries: (state, action: PayloadAction<WageEntry[]>) => {
      // Validate and add imported entries
      const validEntries = action.payload.filter(entry => 
        entry.date && entry.amount && entry.amount > 0
      );
      
      validEntries.forEach(entry => {
        entry.id = uuidv4();
        entry.createdAt = new Date().toISOString();
      });
      
      state.entries = [...state.entries, ...validEntries];
      state.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    
    // Table settings
    updateTableSettings: (state, action: PayloadAction<Partial<WageEntriesState['tableSettings']>>) => {
      state.tableSettings = {
        ...state.tableSettings,
        ...action.payload
      };
    }
  }
});

export const {
  addWageEntry,
  updateWageEntry,
  deleteWageEntry,
  setCountry,
  setEntryMode,
  loadSampleData,
  clearAllEntries,
  duplicateEntry,
  updateAllEntryTypes,
  importEntries,
  updateTableSettings
} = wageEntriesSlice.actions;

// Selectors
export const selectIsEntryModeLocked = (state: { wageEntries: WageEntriesState }) => {
  return state.wageEntries.entries.length > 0;
};

export const selectLockedEntryMode = (state: { wageEntries: WageEntriesState }) => {
  if (state.wageEntries.entries.length === 0) return null;
  // Determine mode from first entry
  const firstEntry = state.wageEntries.entries[0];
  return firstEntry.entryType.includes('annual') ? 'annual' : 'paycheck';
};

export { wageEntriesSlice };