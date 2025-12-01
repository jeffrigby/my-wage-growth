import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { THEME_OPTIONS } from '../../constants';
import type { Theme } from '../../types';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = () => {
    const currentIndex = THEME_OPTIONS.findIndex(option => option.value === theme);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    const nextTheme = THEME_OPTIONS[nextIndex].value as Theme;
    setTheme(nextTheme);
  };

  const currentThemeOption = THEME_OPTIONS.find(option => option.value === theme);

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        );
      case 'dark':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={handleThemeChange}
      className="p-2 rounded-md hover:bg-[var(--border-light)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      title={`Theme: ${currentThemeOption?.label}`}
      aria-label={`Switch theme. Current: ${currentThemeOption?.label}`}
    >
      {getIcon()}
    </button>
  );
};
