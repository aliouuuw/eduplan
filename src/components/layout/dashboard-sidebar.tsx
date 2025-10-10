'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { 
  School, 
  Users, 
  BookOpen, 
  Calendar, 
  Settings,
  LogOut,
  X,
  GraduationCap
} from 'lucide-react';
import type { User } from 'next-auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navigationItems: NavItem[] = [
  // Superadmin
  {
    label: 'Schools',
    href: '/dashboard/superadmin/schools',
    icon: <School className="h-4 w-4" />,
    roles: ['superadmin'],
  },
  {
    label: 'All Users',
    href: '/dashboard/superadmin/users',
    icon: <Users className="h-4 w-4" />,
    roles: ['superadmin'],
  },
  // Admin
  {
    label: 'Dashboard',
    href: '/dashboard/admin',
    icon: <Settings className="h-4 w-4" />,
    roles: ['admin'],
  },
  {
    label: 'Users',
    href: '/dashboard/admin/users',
    icon: <Users className="h-4 w-4" />,
    roles: ['admin'],
  },
  {
    label: 'Academic Levels',
    href: '/dashboard/admin/academic-levels',
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ['admin'],
  },
  {
    label: 'Classes',
    href: '/dashboard/admin/classes',
    icon: <BookOpen className="h-4 w-4" />,
    roles: ['admin'],
  },
  {
    label: 'Subjects',
    href: '/dashboard/admin/subjects',
    icon: <BookOpen className="h-4 w-4" />,
    roles: ['admin'],
  },
  {
    label: 'Timetables',
    href: '/dashboard/admin/timetables',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['admin'],
  },
  // Teacher
  {
    label: 'My Timetable',
    href: '/dashboard/teacher/timetable',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['teacher'],
  },
  {
    label: 'My Classes',
    href: '/dashboard/teacher/classes',
    icon: <BookOpen className="h-4 w-4" />,
    roles: ['teacher'],
  },
  // Parent
  {
    label: 'Children',
    href: '/dashboard/parent/children',
    icon: <Users className="h-4 w-4" />,
    roles: ['parent'],
  },
  {
    label: 'Timetables',
    href: '/dashboard/parent/timetables',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['parent'],
  },
  // Student
  {
    label: 'My Timetable',
    href: '/dashboard/student/timetable',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['student'],
  },
];

interface DashboardSidebarProps {
  user: User;
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const userRole = user.role;
  const allowedNavItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          <Link href="/dashboard" className="text-xl font-bold text-black">
            EduPlan
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {allowedNavItems.map((item) => {
            // Dashboard should only be active on exact match, other items can be active on sub-routes
            const isActive = item.href === '/dashboard/admin' 
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-black text-white' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-black'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <span
                  className={`
                    flex h-9 w-9 items-center justify-center rounded-md border
                    ${isActive 
                      ? 'border-white/20 bg-black text-white' 
                      : 'border-transparent bg-gray-100 text-gray-600 group-hover:border-black/10 group-hover:bg-black group-hover:text-white'
                    }
                  `}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center px-2">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black text-sm font-semibold text-white">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-black">{user.name}</p>
              <p className="text-xs capitalize text-gray-500">{user.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-center gap-2 border-gray-300 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile menu button - exported for use in topbar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}

