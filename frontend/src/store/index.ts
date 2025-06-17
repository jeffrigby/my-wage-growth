import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { cpiSlice } from './slices/cpiSlice';
import { wageEntriesSlice } from './slices/wageEntriesSlice';
import { uiSlice } from './slices/uiSlice';
import { STORAGE_KEYS } from '../constants';

// Load initial state from localStorage
const loadState = () => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (!serializedState) return undefined;
    
    const parsedState = JSON.parse(serializedState);
    
    // No need to convert dates - we're keeping them as strings for Redux serialization
    
    return parsedState;
  } catch (err) {
    console.warn('Failed to load state from localStorage:', err);
    return undefined;
  }
};

// Configure the store
export const store = configureStore({
  reducer: {
    cpiData: cpiSlice.reducer,
    wageEntries: wageEntriesSlice.reducer,
    ui: uiSlice.reducer
  },
  preloadedState: loadState(),
  devTools: import.meta.env.DEV
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Save state to localStorage (selective persistence)
const saveState = (state: RootState) => {
  try {
    const stateToSave = {
      wageEntries: state.wageEntries,
      ui: {
        theme: state.ui.theme,
        sampleDataLoaded: state.ui.sampleDataLoaded
      }
    };
    
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem(STORAGE_KEYS.APP_STATE, serializedState);
  } catch (err) {
    console.warn('Failed to save state to localStorage:', err);
  }
};

// Simple subscription for persistence
let saveTimeout: number;

const handleStateChange = () => {
  clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(() => {
    saveState(store.getState());
  }, 500); // 500ms debounce
};

// Subscribe to store changes
store.subscribe(handleStateChange);

// Cleanup listener for page unload (immediate save)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearTimeout(saveTimeout);
    saveState(store.getState());
  });
}

// Typed hooks for use throughout the app
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();