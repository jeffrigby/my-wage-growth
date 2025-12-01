import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../ui/ThemeToggle';
import { CountryDropdown } from '../ui/CountryDropdown';

export const Header: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.header
      className="sticky top-0 z-50 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border)]"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Real Wage Growth
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isActive('/')
                  ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-light)]'
              }`}
            >
              Calculator
            </Link>

            <Link
              to="/about"
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isActive('/about')
                  ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-light)]'
              }`}
            >
              About
            </Link>

            <div className="w-px h-4 bg-[var(--border)] mx-2" />

            <CountryDropdown />
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </motion.header>
  );
};
