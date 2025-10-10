'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from 'next-auth';

interface DashboardTopBarProps {
  user: User;
}

export function DashboardTopBar({ user }: DashboardTopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
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

