import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[var(--border)] mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[var(--text-muted)]">
          <p>
            Data from official government sources. For educational purposes only.
          </p>
          <p>&copy; {new Date().getFullYear()} Real Wage Growth</p>
        </div>
      </div>
    </footer>
  );
};
