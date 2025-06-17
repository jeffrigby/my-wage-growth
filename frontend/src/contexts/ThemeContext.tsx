import React, { createContext, useContext, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { setTheme } from '../store/slices/uiSlice';
import type { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isSystem: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.ui.theme);

  // Determine the actual theme being used
  const getActualTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  const isDark = getActualTheme() === 'dark';
  const isSystem = theme === 'system';

  useEffect(() => {
    const root = document.documentElement;
    // Determine the actual theme to use
    const actualTheme = theme === 'system' 
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme;
    
    // Apply theme class to document root
    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content', 
        actualTheme === 'dark' ? '#0D0D0D' : '#ffffff'
      );
    } else {
      // Create meta theme-color if it doesn't exist
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = actualTheme === 'dark' ? '#0D0D0D' : '#ffffff';
      document.head.appendChild(meta);
    }
    
    // Set CSS custom properties for smooth transitions
    root.style.setProperty('--theme-transition', 'background-color 0.25s ease, color 0.25s ease');
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const root = document.documentElement;
        const newTheme = e.matches ? 'dark' : 'light';
        
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute(
            'content', 
            newTheme === 'dark' ? '#0D0D0D' : '#ffffff'
          );
        }
      };

      // Add listener for system theme changes
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [theme]);

  // Initialize theme on first load
  useEffect(() => {
    // Set initial theme from system preference if not already set
    if (!localStorage.getItem('wage-growth-state')) {
      dispatch(setTheme('system')); // Default to system theme
    }
  }, [dispatch]);

  const handleSetTheme = (newTheme: Theme) => {
    dispatch(setTheme(newTheme));
    
    // Announce theme change to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Theme changed to ${newTheme === 'system' ? 'system default' : newTheme} mode`;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const contextValue: ThemeContextType = {
    theme,
    setTheme: handleSetTheme,
    isDark,
    isSystem
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};