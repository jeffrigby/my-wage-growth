import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../ui/ThemeToggle';
import { CountryDropdown } from '../ui/CountryDropdown';
import { useAppSelector, useAppDispatch } from '../../store';
import { setShowIntro } from '../../store/slices/uiSlice';
import { ANIMATION_VARIANTS } from '../../constants';

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const hasEntries = useAppSelector(state => state.wageEntries.entries.length > 0);
  const showIntro = useAppSelector(state => state.ui.showIntro);

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.header 
      className="glass-card border-b border-opacity-20 sticky top-0 z-50"
      initial={ANIMATION_VARIANTS.SLIDE_DOWN.initial}
      animate={ANIMATION_VARIANTS.SLIDE_DOWN.animate}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <Link 
            to="/"
            className="flex items-center space-x-3 group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">
                Real Wage Growth
              </h1>
              <p className="text-xs text-muted hidden sm:block">
                Track your purchasing power over time
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'text-primary bg-primary/10' 
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              <i className="fas fa-calculator mr-2"></i>
              Calculator
            </Link>
            
            <Link
              to="/about"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/about') 
                  ? 'text-primary bg-primary/10' 
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              <i className="fas fa-info-circle mr-2"></i>
              About
            </Link>

            {/* Share button - only show when there are entries */}
            {hasEntries && (
              <button className="btn-ghost px-3 py-2 rounded-md text-sm font-medium">
                <i className="fas fa-share-alt mr-2"></i>
                Share
              </button>
            )}
          </nav>

          {/* Country selector, theme toggle and mobile menu */}
          <div className="flex items-center space-x-2">
            <CountryDropdown />
            
            {/* Show intro button - only on home page when intro is hidden */}
            {location.pathname === '/' && !showIntro && (
              <button
                onClick={() => dispatch(setShowIntro(true))}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-secondary hover:text-primary"
                aria-label="Show introduction"
                title="Show introduction"
              >
                <i className="fas fa-question-circle"></i>
              </button>
            )}
            
            <ThemeToggle />
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden btn-ghost p-2 rounded-md"
              aria-label="Open menu"
            >
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t border-opacity-20 py-4">
          <nav className="flex flex-col space-y-2">
            <Link
              to="/"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'text-primary bg-primary/10' 
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              <i className="fas fa-calculator mr-3"></i>
              Calculator
            </Link>
            
            <Link
              to="/about"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/about') 
                  ? 'text-primary bg-primary/10' 
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              <i className="fas fa-info-circle mr-3"></i>
              About Inflation
            </Link>

            {hasEntries && (
              <button className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-secondary hover:text-primary hover:bg-surface transition-colors">
                <i className="fas fa-share-alt mr-3"></i>
                Share Results
              </button>
            )}
          </nav>
        </div>
      </div>
    </motion.header>
  );
};