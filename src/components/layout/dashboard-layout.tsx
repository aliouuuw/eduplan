'use client';

import { ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  School, 
  Users, 
  BookOpen, 
  Calendar, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: string[];
}

const navigationItems: NavItem[] = [
  {
    label: 'Schools',
    href: '/dashboard/superadmin/schools',
    icon: <School className="h-4 w-4" />,
    roles: ['superadmin'],
  },
  {
    label: 'Users',
    href: '/dashboard/superadmin/users',
    icon: <Users className="h-4 w-4" />,
    roles: ['superadmin'],
  },
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
  {
    label: 'My Timetable',
    href: '/dashboard/student/timetable',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['student'],
  },
];

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we load your dashboard.</p>
        </div>
      </div>
    );
  }

  const userRole = session.user.role;
  const allowedNavItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">EduPlan</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {allowedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{session.user.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-3"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {description && (
                  <p className="text-sm text-gray-600">{description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
