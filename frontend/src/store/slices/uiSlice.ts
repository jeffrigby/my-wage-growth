import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UIState, Theme } from '../../types';

const initialState: UIState = {
  theme: 'system',
  showIntro: true,
  sampleDataLoaded: false,
  isCalculating: false,
  shareModalOpen: false,
  wageEntryModalOpen: false,
  editingEntryId: null
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    setShowIntro: (state, action: PayloadAction<boolean>) => {
      state.showIntro = action.payload;
    },
    setSampleDataLoaded: (state, action: PayloadAction<boolean>) => {
      state.sampleDataLoaded = action.payload;
    },
    setIsCalculating: (state, action: PayloadAction<boolean>) => {
      state.isCalculating = action.payload;
    },
    setShareModalOpen: (state, action: PayloadAction<boolean>) => {
      state.shareModalOpen = action.payload;
    },
    setWageEntryModalOpen: (state, action: PayloadAction<boolean>) => {
      state.wageEntryModalOpen = action.payload;
      // Clear editing ID when closing modal
      if (!action.payload) {
        state.editingEntryId = null;
      }
    },
    setEditingEntryId: (state, action: PayloadAction<string | null>) => {
      state.editingEntryId = action.payload;
    },
    openWageEntryModal: (state, action: PayloadAction<string | undefined>) => {
      state.wageEntryModalOpen = true;
      state.editingEntryId = action.payload || null;
    },
    closeWageEntryModal: (state) => {
      state.wageEntryModalOpen = false;
      state.editingEntryId = null;
    },
    resetUI: (state) => {
      state.showIntro = true;
      state.sampleDataLoaded = false;
      state.isCalculating = false;
      state.shareModalOpen = false;
      state.wageEntryModalOpen = false;
      state.editingEntryId = null;
    }
  }
});

export const {
  setTheme,
  setShowIntro,
  setSampleDataLoaded,
  setIsCalculating,
  setShareModalOpen,
  setWageEntryModalOpen,
  setEditingEntryId,
  openWageEntryModal,
  closeWageEntryModal,
  resetUI
} = uiSlice.actions;

export { uiSlice };