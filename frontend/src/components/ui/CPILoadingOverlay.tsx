import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ANIMATION_VARIANTS } from '../../constants';

interface CPILoadingOverlayProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  loadedCount?: number;
  totalCount?: number;
}

export const CPILoadingOverlay: React.FC<CPILoadingOverlayProps> = ({
  isLoading,
  error,
  onRetry,
  loadedCount = 0,
  totalCount = 3
}) => {
  // Don't show overlay if neither loading nor error
  if (!isLoading && !error) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={ANIMATION_VARIANTS.FADE_IN.initial}
        animate={ANIMATION_VARIANTS.FADE_IN.animate}
        exit={ANIMATION_VARIANTS.FADE_IN.exit}
      >
        <motion.div
          className="glass-card p-8 max-w-md mx-4 text-center"
          initial={ANIMATION_VARIANTS.SCALE_IN.initial}
          animate={ANIMATION_VARIANTS.SCALE_IN.animate}
          exit={ANIMATION_VARIANTS.SCALE_IN.exit}
        >
          {isLoading ? (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <i className="fas fa-chart-line text-2xl text-primary animate-pulse"></i>
                </div>
                <h2 className="text-xl font-semibold mb-2">Loading Inflation Data</h2>
                <p className="text-secondary">
                  Fetching the latest CPI data from government sources...
                </p>
              </div>
              
              {/* Progress indicator */}
              <div className="mb-4">
                <div className="flex justify-center space-x-2 mb-2">
                  {Array.from({ length: totalCount }).map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index < loadedCount 
                          ? 'bg-accent' 
                          : 'bg-muted animate-pulse'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted">
                  Loading data for {totalCount} countries...
                </p>
              </div>
              
              {/* Loading spinner */}
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </>
          ) : error ? (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                  <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                </div>
                <h2 className="text-xl font-semibold mb-2">Unable to Load Data</h2>
                <p className="text-secondary mb-4">
                  {error || 'Failed to fetch inflation data. Please check your connection and try again.'}
                </p>
              </div>
              
              <button
                onClick={onRetry}
                className="btn-primary px-6 py-2 rounded-lg"
              >
                <i className="fas fa-redo mr-2"></i>
                Try Again
              </button>
              
              <p className="text-xs text-muted mt-4">
                If the problem persists, please refresh the page or try again later.
              </p>
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};