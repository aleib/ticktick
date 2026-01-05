import type { ReactNode } from 'react';
import { Navigation } from './Navigation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Navigation />
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

