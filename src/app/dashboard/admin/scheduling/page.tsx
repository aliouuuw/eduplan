'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, BookOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminSchedulingPage() {
  const quickActions = [
    {
      title: 'Schedule Templates',
      description: 'Create templates for different class levels',
      icon: <Settings className="h-5 w-5" />,
      href: '/dashboard/admin/scheduling/templates',
    },
    {
      title: 'Manage Time Slots',
      description: 'Define time periods within each template',
      icon: <Clock className="h-5 w-5" />,
      href: '/dashboard/admin/scheduling/time-slots',
    },
    {
      title: 'Manage Timetables',
      description: 'Create, view, and edit class schedules',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/admin/scheduling/timetables',
    },
    {
      title: 'Teacher Availability',
      description: 'Configure when teachers are available to teach',
      icon: <BookOpen className="h-5 w-5" />,
      href: '/dashboard/admin/teachers/availability',
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">Scheduling Hub</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Centralized management for all school scheduling operations, including timetables, time slots, and teacher availability.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick actions</h2>
          <span className="text-xs text-gray-400">Jump straight into key scheduling workflows</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} className="group block h-full">
              <Card className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-black hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-black text-white transition group-hover:scale-105">
                  {action.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-black">{action.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{action.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* TODO: Add sections for conflicts, upcoming schedules, etc. */}
    </div>
  );
}
