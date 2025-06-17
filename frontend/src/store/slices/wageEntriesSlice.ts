import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { 
  WageEntriesState, 
  WageEntry, 
  AddWageEntryPayload, 
  UpdateWageEntryPayload,
  SetCountryPayload,
  EntryMode 
} from '../../types';

const initialState: WageEntriesState = {
  entries: [],
  country: 'US',
  currency: 'USD',
  entryMode: 'annual'
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
        date,
        amount,
        entryType,
        label,
        createdAt: new Date()
      };
      
      state.entries.push(newEntry);
      // Sort entries by date
      state.entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    
    updateWageEntry: (state, action: PayloadAction<UpdateWageEntryPayload>) => {
      const { id, updates } = action.payload;
      const entryIndex = state.entries.findIndex(entry => entry.id === id);
      
      if (entryIndex !== -1) {
        state.entries[entryIndex] = {
          ...state.entries[entryIndex],
          ...updates
        };
        // Re-sort after update if date changed
        if (updates.date) {
          state.entries.sort((a, b) => a.date.getTime() - b.date.getTime());
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
      // Clear entries when changing countries as CPI data differs
      state.entries = [];
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
    
    loadSampleData: (state, action: PayloadAction<WageEntry[]>) => {
      state.entries = action.payload.map(entry => ({
        ...entry,
        id: uuidv4(),
        createdAt: new Date()
      }));
      state.entries.sort((a, b) => a.date.getTime() - b.date.getTime());
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
          createdAt: new Date()
        };
        state.entries.push(duplicatedEntry);
        state.entries.sort((a, b) => a.date.getTime() - b.date.getTime());
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
        entry.createdAt = new Date();
      });
      
      state.entries = [...state.entries, ...validEntries];
      state.entries.sort((a, b) => a.date.getTime() - b.date.getTime());
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
  importEntries
} = wageEntriesSlice.actions;

export { wageEntriesSlice };