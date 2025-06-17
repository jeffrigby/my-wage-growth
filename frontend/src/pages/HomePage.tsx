import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../store';
import { setShowIntro } from '../store/slices/uiSlice';
import { ANIMATION_VARIANTS } from '../constants';
import { WageEntriesTable } from '../components/calculator/WageEntriesTable';
import { WageEntryModal } from '../components/calculator/WageEntryModal';

export const HomePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const showIntro = useAppSelector(state => state.ui.showIntro);
  const entries = useAppSelector(state => state.wageEntries.entries);
  
  // Hide intro after first entry is added
  React.useEffect(() => {
    if (entries.length > 0 && showIntro) {
      dispatch(setShowIntro(false));
    }
  }, [entries.length, showIntro, dispatch]);

  return (
    <motion.div
      className="max-w-6xl mx-auto space-y-8"
      initial={ANIMATION_VARIANTS.FADE_IN.initial}
      animate={ANIMATION_VARIANTS.FADE_IN.animate}
      exit={ANIMATION_VARIANTS.FADE_IN.exit}
    >
      {/* Hero section */}
      {showIntro && (
        <motion.section
          className="text-center space-y-6"
          initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
          animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gradient">
              Real Wage Growth Calculator
            </h1>
            <p className="text-xl md:text-2xl text-secondary max-w-3xl mx-auto">
              Discover how your earnings have grown compared to inflation over time. 
              See your true purchasing power and make informed financial decisions.
            </p>
          </div>

          <div className="glass-card p-6 md:p-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center justify-center space-x-2">
                <i className="fas fa-lightbulb text-accent"></i>
                <span>Why This Matters</span>
              </h2>
              <p className="text-secondary leading-relaxed">
                A 3% raise might feel good, but if inflation was 5%, you actually lost purchasing power. 
                This calculator shows you the reality behind your wage growth using official government inflation data.
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {/* Main calculator interface */}
      <motion.section
        className="space-y-6"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Wage Entries Table */}
        <WageEntriesTable />

        {/* Results section */}
        {entries.length >= 2 && (
          <div className="glass-card p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center space-x-2">
              <i className="fas fa-chart-line text-primary"></i>
              <span>Your Wage Growth Analysis</span>
            </h2>
            
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center text-muted">
              <i className="fas fa-chart-bar text-2xl mb-2"></i>
              <p>Results Visualization Component</p>
              <p className="text-sm">Coming Soon</p>
            </div>
          </div>
        )}

      </motion.section>

      {/* Wage Entry Modal */}
      <WageEntryModal />
    </motion.div>
  );
};