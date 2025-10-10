'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { School, Users, BookOpen, GraduationCap, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DashboardStats {
  totalSchools?: number;
  activeSchools?: number;
  inactiveSchools?: number;
  totalUsers?: number;
  totalAdmins?: number;
  totalTeachers?: number;
  totalStudents?: number;
  totalParents?: number;
  totalClasses?: number;
  totalSubjects?: number;
  totalLevels?: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsResponse = await fetch('/api/dashboard/superadmin/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Schools',
      value: stats.totalSchools || 0,
      description: 'All schools in the system',
      icon: <School className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/superadmin/schools',
    },
    {
      title: 'Active Schools',
      value: stats.activeSchools || 0,
      description: 'Currently operational schools',
      icon: <UserCheck className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/superadmin/schools',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      description: 'All users across all schools',
      icon: <Users className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/superadmin/users',
    },
    {
      title: 'Total Classes',
      value: stats.totalClasses || 0,
      description: 'Classes across all schools',
      icon: <BookOpen className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/superadmin/schools',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Schools',
      description: 'Create new schools and invite administrators',
      icon: <School className="h-5 w-5" />,
      href: '/dashboard/superadmin/schools',
    },
    {
      title: 'System Users',
      description: 'View all users across all schools',
      icon: <Users className="h-5 w-5" />,
      href: '/dashboard/superadmin/users',
    },
    {
      title: 'Academic Overview',
      description: 'System-wide academic structure and statistics',
      icon: <GraduationCap className="h-5 w-5" />,
      href: '/dashboard/superadmin/schools',
    },
    {
      title: 'System Settings',
      description: 'Configure global system parameters',
      icon: <Clock className="h-5 w-5" />,
      href: '/dashboard/superadmin',
    },
  ];

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">
          System Administration
        </h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Monitor system-wide performance, manage schools, and oversee the entire education platform.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Overview</h2>
          <span className="text-xs text-gray-400">Updated moments ago</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href} className="group block h-full">
              <article className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{stat.title}</p>
                    <div className="text-3xl font-semibold text-black">
                      {loading ? (
                        <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </div>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                    {stat.icon}
                  </span>
                </div>
                <p className="mt-4 text-xs text-gray-500">{stat.description}</p>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick actions</h2>
          <span className="text-xs text-gray-400">Jump straight into the workflows you manage most</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} className="group block h-full">
              <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-black hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-black text-white transition group-hover:scale-105">
                  {action.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-black">{action.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{action.description}</p>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="h-full rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-black">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              System alerts
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Important notifications requiring your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="h-11 w-11 animate-pulse rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <School className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black">{(stats.inactiveSchools || 0) > 0 ? `${stats.inactiveSchools} inactive schools` : 'All schools active'}</p>
                    <p className="text-xs text-gray-500">Monitor school status</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="border-gray-300">
                    <Link href="/dashboard/superadmin/schools">Review</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black">System user growth</p>
                    <p className="text-xs text-gray-500">{stats.totalUsers} total registered users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black">Academic structure</p>
                    <p className="text-xs text-gray-500">{stats.totalSubjects} subjects, {stats.totalLevels} academic levels</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold text-black">Recent activity</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Latest system-wide changes and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <School className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">New school registered</p>
                    <p className="text-xs text-gray-500">School code: {stats.totalSchools ? `SCH-${String(stats.totalSchools).padStart(3, '0')}` : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">User registration surge</p>
                    <p className="text-xs text-gray-500">{stats.totalTeachers} teachers, {stats.totalStudents} students</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">Academic levels updated</p>
                    <p className="text-xs text-gray-500">{stats.totalLevels} academic levels configured</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">System operational</p>
                    <p className="text-xs text-gray-500">All services running normally</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
