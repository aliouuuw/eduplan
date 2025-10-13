'use client';

import Link from 'next/link';
import { ChevronRight, LayoutDashboard } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="text-sm font-medium text-gray-500 mb-6">
      <ol className="list-none p-0 inline-flex">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center">
              {/* Separator (not shown before first item) */}
              {!isFirst && (
                <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
              )}

              {/* Item content */}
              {isLast ? (
                // Last item (current page) - not clickable
                <div className="flex items-center text-gray-900">
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              ) : (
                // Clickable items
                <Link
                  href={item.href || '#'}
                  className="flex items-center text-gray-500 hover:text-black transition-colors"
                >
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Preset breadcrumb configurations for common patterns
export const createBreadcrumbs = {
  dashboard: () => [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard className="h-4 w-4" /> }
  ],

  classGroups: () => [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Class Groups', href: '/dashboard/admin/class-groups' }
  ],

  classes: () => [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Classes', href: '/dashboard/admin/classes' }
  ],

  subjects: () => [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Subjects', href: '/dashboard/admin/subjects' }
  ],

  teachers: () => [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Teachers', href: '/dashboard/admin/teachers' }
  ],

  scheduling: () => [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Scheduling', href: '/dashboard/admin/scheduling' }
  ]
};
