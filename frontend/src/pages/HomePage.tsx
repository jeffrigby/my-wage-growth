import React from 'react';
import { motion } from 'framer-motion';
import { WageEntriesTable } from '../components/calculator/WageEntriesTable';
import { WageEntryModal } from '../components/calculator/WageEntryModal';

export const HomePage: React.FC = () => {
  return (
    <motion.div
      className="max-w-4xl mx-auto px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hero - minimal, typography-focused */}
      <header className="mb-12">
        <h1
          className="text-4xl md:text-5xl font-medium tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Is your salary keeping up?
        </h1>
        <p className="text-lg text-[var(--text-secondary)]">
          Track your real wage growth adjusted for inflation.
        </p>
      </header>

      {/* Main content */}
      <WageEntriesTable />

      {/* Modal */}
      <WageEntryModal />
    </motion.div>
  );
};
