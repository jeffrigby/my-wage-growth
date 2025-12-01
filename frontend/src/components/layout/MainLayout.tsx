import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import type { BaseComponentProps } from '../../types';

interface MainLayoutProps extends BaseComponentProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen flex flex-col bg-[var(--background)] ${className}`}>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};
