import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../../store';
import { setCountry } from '../../store/slices/wageEntriesSlice';
import { COUNTRIES, ANIMATION_VARIANTS } from '../../constants';
import type { Country } from '../../types';

export const CountryDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  
  const currentCountry = useAppSelector(state => state.wageEntries.country);
  const hasEntries = useAppSelector(state => state.wageEntries.entries.length > 0);
  
  const countryInfo = COUNTRIES[currentCountry];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleCountrySelect = (countryCode: Country) => {
    const newCountryInfo = COUNTRIES[countryCode];
    
    // Show warning if there are entries
    if (hasEntries && countryCode !== currentCountry) {
      const confirmed = window.confirm(
        `Changing country will clear your current wage entries. Are you sure you want to switch to ${newCountryInfo.name}?`
      );
      
      if (!confirmed) {
        setIsOpen(false);
        return;
      }
    }
    
    dispatch(setCountry({
      country: countryCode,
      currency: newCountryInfo.currency
    }));
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg glass-card hover:bg-surface-hover transition-all duration-200 text-sm font-medium"
        aria-label="Select country"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-lg">{countryInfo.flag}</span>
        <span className="hidden sm:inline">{countryInfo.name}</span>
        <span className="font-bold text-primary">{countryInfo.currencySymbol}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs text-muted transition-transform duration-200`}></i>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={ANIMATION_VARIANTS.SCALE_IN.initial}
            animate={ANIMATION_VARIANTS.SCALE_IN.animate}
            exit={ANIMATION_VARIANTS.SCALE_IN.exit}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 rounded-lg glass-card shadow-lg overflow-hidden z-50"
          >
            <div className="py-2">
              {Object.entries(COUNTRIES).map(([code, country]) => (
                <button
                  key={code}
                  onClick={() => handleCountrySelect(code as Country)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-surface-hover transition-colors duration-150 ${
                    code === currentCountry ? 'bg-primary/10 text-primary' : 'text-secondary'
                  }`}
                >
                  <span className="text-lg">{country.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{country.name}</div>
                    <div className="text-xs text-muted">
                      {country.currency} ({country.currencySymbol})
                    </div>
                  </div>
                  {code === currentCountry && (
                    <i className="fas fa-check text-primary"></i>
                  )}
                </button>
              ))}
            </div>
            
            {/* Info footer */}
            <div className="border-t border-border px-4 py-3 bg-surface/50">
              <p className="text-xs text-muted">
                <i className="fas fa-info-circle mr-1"></i>
                Data from {countryInfo.cpiSource}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};