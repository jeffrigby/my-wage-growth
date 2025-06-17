import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import type { BaseComponentProps } from '../../types';

interface MainLayoutProps extends BaseComponentProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      <Header />
      <main className="flex-1 w-full">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};