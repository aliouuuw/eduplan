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
  GraduationCap,
  Mail,
  Key,
  Clock,
  LayoutDashboard,
  FolderTree,
  BookText,
  UserCog,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import type { User } from 'next-auth';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  roles: string[];
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  // Superadmin
  {
    label: 'Dashboard',
    href: '/dashboard/superadmin',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['superadmin'],
  },
  {
    label: 'Schools',
    href: '/dashboard/superadmin/schools',
    icon: <School className="h-4 w-4" />,
    roles: ['superadmin'],
  },
  {
    label: 'System Users',
    href: '/dashboard/superadmin/users',
    icon: <Users className="h-4 w-4" />,
    roles: ['superadmin'],
  },
  {
    label: 'Password Resets',
    href: '/dashboard/superadmin/password-resets',
    icon: <Key className="h-4 w-4" />,
    roles: ['superadmin'],
  },
  
  // Admin - Overview
  {
    label: 'Dashboard',
    href: '/dashboard/admin',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['admin'],
  },
  
  // Admin - Academic Structure (consolidated - all 4 items)
  {
    label: 'Academic Structure',
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ['admin'],
    children: [
      {
        label: 'Class Groups',
        href: '/dashboard/admin/class-groups',
        icon: <FolderTree className="h-4 w-4" />,
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
        icon: <BookText className="h-4 w-4" />,
        roles: ['admin'],
      },
      {
        label: 'Teachers',
        href: '/dashboard/admin/teachers',
        icon: <Users className="h-4 w-4" />,
        roles: ['admin'],
      },
    ],
  },
  
  // Admin - Scheduling (dedicated section)
  {
    label: 'Scheduling',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['admin'],
    children: [
      {
        label: 'Templates',
        href: '/dashboard/admin/scheduling/templates',
        icon: <FolderTree className="h-4 w-4" />,
        roles: ['admin'],
      },
      {
        label: 'Time Slots',
        href: '/dashboard/admin/scheduling/time-slots',
        icon: <Clock className="h-4 w-4" />,
        roles: ['admin'],
      },
      {
        label: 'Timetables',
        href: '/dashboard/admin/scheduling/timetables',
        icon: <Calendar className="h-4 w-4" />,
        roles: ['admin'],
      },
    ],
  },
  
  // Admin - Settings
  {
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    roles: ['admin'],
    children: [
      {
        label: 'Users & Access',
        href: '/dashboard/admin/users',
        icon: <UserCog className="h-4 w-4" />,
        roles: ['admin'],
      },
      {
        label: 'Invitations',
        href: '/dashboard/admin/invitations',
        icon: <Mail className="h-4 w-4" />,
        roles: ['admin'],
      },
    ],
  },
  
  // Teacher
  {
    label: 'Dashboard',
    href: '/dashboard/teacher',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['teacher'],
  },
  {
    label: 'My Availability',
    href: '/dashboard/teacher/availability',
    icon: <Clock className="h-4 w-4" />,
    roles: ['teacher'],
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
  
  // Parent
  {
    label: 'Dashboard',
    href: '/dashboard/parent',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['parent'],
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
  
  // Student
  {
    label: 'Dashboard',
    href: '/dashboard/student',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['student'],
  },
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  const userRole = user.role;
  const allowedNavItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const isItemActive = (item: NavItem): boolean => {
    if (!item.href) return false;
    const isDashboardHome = item.href === '/dashboard/admin' || 
                            item.href === '/dashboard/teacher' || 
                            item.href === '/dashboard/superadmin' ||
                            item.href === '/dashboard/parent' ||
                            item.href === '/dashboard/student';
    return isDashboardHome
      ? pathname === item.href
      : pathname === item.href || pathname?.startsWith(item.href + '/');
  };

  const isSectionActive = (item: NavItem): boolean => {
    if (item.children) {
      return item.children.some(child => isItemActive(child));
    }
    return false;
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isItemActive(item);
    const isSectionOpen = openSections[item.label] ?? isSectionActive(item);

    if (hasChildren) {
      return (
        <div key={item.label} className="space-y-1">
          <button
            onClick={() => toggleSection(item.label)}
            className={`
              group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors
              ${isSectionActive(item)
                ? 'text-[#2b2a3d]'
                : 'text-[#6e6e7e] hover:bg-white/50 hover:text-[#2b2a3d]'
              }
            `}
          >
            <span className={isSectionActive(item) ? 'text-[#6b7cf7]' : 'text-[#b5aec4] group-hover:text-[#6e6e7e]'}>
              {item.icon}
            </span>
            <span className="flex-1 truncate text-left">{item.label}</span>
            {isSectionOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {isSectionOpen && item.children && (
            <div className="ml-4 space-y-1 pl-2">
              {item.children.map(child => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    // Regular link item
    return (
      <Link
        key={item.href}
        href={item.href!}
        className={`
          group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors
          ${isChild ? 'pl-2' : ''}
          ${isActive
            ? 'soft-raised bg-white font-semibold text-[#2b2a3d]'
            : 'text-[#6e6e7e] hover:bg-white/50 hover:text-[#2b2a3d]'
          }
        `}
        onClick={() => setSidebarOpen(false)}
      >
        <span className={isActive ? 'text-[#6b7cf7]' : 'text-[#b5aec4] group-hover:text-[#6e6e7e]'}>
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#2d2d3a]/25 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        glass fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col rounded-r-[22px] lg:inset-y-3 lg:left-3 lg:rounded-[22px]
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex items-center justify-between px-5 pb-6 pt-7">
          <Link href="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[#6b7cf7]" strokeWidth={2.25} />
            <span className="text-lg font-bold tracking-tight text-[#111827]">EduPlan</span>
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

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {allowedNavItems.map(item => renderNavItem(item))}
        </nav>

        <div className="px-3 pb-3 pt-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="soft-raised flex w-full items-center gap-2 rounded-[14px] bg-white/80 px-2 py-2 text-left transition-colors hover:bg-white"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#e8e5ff] text-xs font-bold text-[#4a57c9]">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold leading-tight text-[#111827]">{user.name}</span>
              <span className="block truncate text-[11px] font-medium capitalize leading-tight text-[#7b7590]">{user.role}</span>
            </span>
            <LogOut className="h-3.5 w-3.5 flex-shrink-0 text-[#7b7590]" aria-label="Sign out" />
          </button>
        </div>
      </aside>

      {/* Mobile menu button - exported for use in topbar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6b7cf7] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_6px_rgba(74,88,220,0.35)] lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}

