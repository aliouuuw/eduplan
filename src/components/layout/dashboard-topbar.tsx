'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from 'next-auth';

interface DashboardTopBarProps {
  user: User;
}

export function DashboardTopBar({ user }: DashboardTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/50 bg-white/45 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6 sm:px-8">
        {/* Mobile menu button - Only visible on mobile */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={() => {
            // This will be handled by the floating button in sidebar
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Right side - could add notifications, search, etc */}
        <div className="ml-auto flex items-center gap-4">
          {/* Placeholder for future features like notifications */}
        </div>
      </div>
    </header>
  );
}

