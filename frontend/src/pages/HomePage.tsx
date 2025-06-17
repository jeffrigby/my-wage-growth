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
          className="text-center space-y-6 relative"
          initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
          animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
          transition={{ duration: 0.6 }}
        >
          {/* Dismiss button */}
          <button
            onClick={() => dispatch(setShowIntro(false))}
            className="absolute -top-2 -right-2 p-2 text-muted hover:text-secondary transition-colors z-10 bg-background rounded-full shadow-sm hover:shadow-md"
            aria-label="Dismiss introduction"
          >
            <i className="fas fa-times text-lg"></i>
          </button>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gradient">
              Real Wage Growth Calculator
            </h1>
            <p className="text-xl md:text-2xl text-secondary max-w-3xl mx-auto">
              See if your salary is keeping up with the cost of living
            </p>
          </div>

          {/* Eye-catching stat */}
          <div className="glass-card p-4 max-w-md mx-auto bg-accent/5 border-accent/20">
            <p className="text-lg font-semibold text-accent">
              <i className="fas fa-chart-line mr-2"></i>
              Did you know? $100 in 2000 is worth only $65 today
            </p>
          </div>

          <div className="glass-card p-6 md:p-8 max-w-3xl mx-auto">
            <div className="space-y-6">
              {/* The Problem */}
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold flex items-center justify-center space-x-2">
                  <i className="fas fa-question-circle text-primary"></i>
                  <span>The Hidden Truth About Your Raises</span>
                </h2>
                <p className="text-secondary leading-relaxed">
                  That 5% raise sounds great – until you realize inflation was 7%. Without adjusting for inflation, 
                  you can't know if your standard of living is actually improving or declining.
                </p>
              </div>

              {/* The Solution */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-primary">
                  This calculator reveals your real wage growth
                </h3>
                <div className="grid md:grid-cols-3 gap-4 text-left">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-accent">
                      <i className="fas fa-chart-bar"></i>
                      <span className="font-medium">Track Progress</span>
                    </div>
                    <p className="text-sm text-secondary">
                      See if your earnings are beating inflation year over year
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-accent">
                      <i className="fas fa-balance-scale"></i>
                      <span className="font-medium">Compare Offers</span>
                    </div>
                    <p className="text-sm text-secondary">
                      Evaluate job offers in real purchasing power, not just dollars
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-accent">
                      <i className="fas fa-handshake"></i>
                      <span className="font-medium">Negotiate Better</span>
                    </div>
                    <p className="text-sm text-secondary">
                      Use data to make your case for inflation-adjusted raises
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust signals */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted flex items-center justify-center">
                  <i className="fas fa-shield-alt mr-2"></i>
                  Powered by official CPI data from US BLS, Statistics Canada, and UK ONS
                </p>
              </div>
            </div>
          </div>

          {/* Call to action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <p className="text-lg text-secondary">
              Ready to see the truth? Start by adding your wage history below.
            </p>
          </motion.div>
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