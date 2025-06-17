import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../store';
import { COUNTRIES, ANIMATION_VARIANTS } from '../../constants';

export const Footer: React.FC = () => {
  const lastFetch = useAppSelector(state => state.cpiData.lastFetch);
  const currentCountry = useAppSelector(state => state.wageEntries.country);
  
  const countryMetadata = COUNTRIES[currentCountry];
  
  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return 'Unknown';
    }
  };

  return (
    <motion.footer 
      className="border-t border-opacity-20 bg-surface/50"
      initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
      animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          
          {/* Data source information */}
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-muted">
            <div className="flex items-center space-x-2">
              <i className={`fas ${countryMetadata.flag} text-primary`}></i>
              <span>
                Data from <strong>{countryMetadata.cpiSource}</strong>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <i className="fas fa-clock text-primary"></i>
              <span>
                Last updated: <strong>{formatLastUpdate(lastFetch)}</strong>
              </span>
            </div>
          </div>

          {/* Links and attribution */}
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm">
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/anthropics/claude-code" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted hover:text-primary transition-colors flex items-center space-x-1"
              >
                <i className="fab fa-github"></i>
                <span>Source</span>
              </a>
              
              <a 
                href="/about" 
                className="text-muted hover:text-primary transition-colors flex items-center space-x-1"
              >
                <i className="fas fa-question-circle"></i>
                <span>Help</span>
              </a>
            </div>
            
            <div className="text-muted text-center md:text-right">
              <p>&copy; 2024 Real Wage Growth Calculator</p>
              <p className="text-xs opacity-75">
                Built with modern web technologies
              </p>
            </div>
          </div>
        </div>

        {/* Additional information */}
        <div className="mt-4 pt-4 border-t border-opacity-20">
          <div className="text-xs text-muted text-center space-y-1">
            <p>
              <strong>Disclaimer:</strong> This tool provides educational estimates only. 
              Consult financial professionals for investment decisions.
            </p>
            <p>
              Inflation data is sourced from official government statistics agencies. 
              Real wage calculations adjust nominal wages using Consumer Price Index (CPI) data.
            </p>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};