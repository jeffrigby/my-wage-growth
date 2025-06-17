import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { THEME_OPTIONS } from '../../constants';
import type { Theme } from '../../types';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = () => {
    // Cycle through themes: light -> dark -> system -> light
    const currentIndex = THEME_OPTIONS.findIndex(option => option.value === theme);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    const nextTheme = THEME_OPTIONS[nextIndex].value as Theme;
    setTheme(nextTheme);
  };

  const currentThemeOption = THEME_OPTIONS.find(option => option.value === theme);

  return (
    <motion.button
      onClick={handleThemeChange}
      className="btn-ghost p-2 rounded-lg relative overflow-hidden"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Current theme: ${currentThemeOption?.label}. Click to cycle themes.`}
      aria-label={`Switch theme. Current: ${currentThemeOption?.label}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -180 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 180 }}
          transition={{ duration: 0.3 }}
          className="flex items-center space-x-1"
        >
          <i className={`fas ${currentThemeOption?.icon} text-lg`}></i>
          <span className="hidden sm:inline text-sm font-medium">
            {currentThemeOption?.label}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Visual indicator for theme cycling */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-1">
          {THEME_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`w-1 h-1 rounded-full transition-all duration-200 ${
                option.value === theme 
                  ? 'bg-primary scale-125' 
                  : 'bg-muted opacity-50'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.button>
  );
};