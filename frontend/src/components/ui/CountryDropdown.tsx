import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../../store';
import { setCountry } from '../../store/slices/wageEntriesSlice';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../types';

export const CountryDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();

  const currentCountry = useAppSelector(state => state.wageEntries.country);
  const countryInfo = COUNTRIES[currentCountry];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleCountrySelect = (countryCode: Country) => {
    if (countryCode === currentCountry) {
      setIsOpen(false);
      return;
    }

    const newCountryInfo = COUNTRIES[countryCode];
    dispatch(setCountry({
      country: countryCode,
      currency: newCountryInfo.currency
    }));
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[var(--border-light)] transition-colors text-sm"
        aria-label="Select country"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{countryInfo.flag}</span>
        <span className="font-medium text-[var(--text-secondary)]">{countryInfo.currencySymbol}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-md card-elevated shadow-lg overflow-hidden z-50"
          >
            <div className="py-1">
              {Object.entries(COUNTRIES).map(([code, country]) => (
                <button
                  key={code}
                  onClick={() => handleCountrySelect(code as Country)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--border-light)] transition-colors ${
                    code === currentCountry
                      ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <span>{country.flag}</span>
                  <span className="flex-1 text-left">{country.name}</span>
                  <span className="text-[var(--text-muted)]">{country.currencySymbol}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
