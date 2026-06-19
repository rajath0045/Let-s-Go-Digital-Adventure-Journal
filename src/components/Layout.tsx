import React from 'react';
import {
  Compass,
  Trophy,
  Map,
  Settings
} from 'lucide-react';
import { Waves } from '@/components/ui/wave-background';
import { AnimatedDock } from '@/components/ui/animated-dock';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {

  const dockItems = [
    { link: '/', Icon: <Compass size={22} /> },
    { link: '/accomplished', Icon: <Trophy size={22} /> },
    { link: '/map', Icon: <Map size={22} /> },
    { link: '/settings', Icon: <Settings size={22} /> }
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-parchment-50 text-parchment-900 transition-colors duration-200 overflow-hidden">
      {/* Dynamic Wave Background - adapted for Light Parchment Theme */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        <Waves
          backgroundColor="#f6f8fc"
          strokeColor="rgba(80, 70, 230, 0.08)"
          pointerSize={0.4}
        />
      </div>

      {/* Main Content Area with Bottom Padding for Dock */}
      <main className="relative z-10 flex-1 p-4 md:p-8 pb-28 overflow-y-auto max-h-screen">
        <div className="w-full h-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Floating Animated Dock Navigation Menu */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 pointer-events-auto">
        <AnimatedDock items={dockItems} />
      </div>
    </div>
  );
};
