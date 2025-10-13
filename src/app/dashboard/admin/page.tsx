'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, UserCheck, Clock, AlertCircle, Calendar, FolderTree, BookText } from 'lucide-react';
import { DashboardStats } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState<string>('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user?.schoolId) return;

      try {
        // Fetch school info
        const schoolResponse = await fetch(`/api/schools/${session.user.schoolId}`);
        if (schoolResponse.ok) {
          const schoolData = await schoolResponse.json();
          setSchoolName(schoolData.name);
        }

        // Fetch stats for this school
        const statsResponse = await fetch(`/api/dashboard/admin/stats?schoolId=${session.user.schoolId}`);
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
  }, [session?.user?.schoolId]);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      description: 'All users in your school',
      icon: <Users className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/admin/users',
    },
    {
      title: 'Active Teachers',
      value: stats.totalTeachers || 0,
      description: 'Teaching staff',
      icon: <UserCheck className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/admin/users?role=teacher',
    },
    {
      title: 'Active Students',
      value: stats.totalStudents || 0,
      description: 'Enrolled students',
      icon: <GraduationCap className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/admin/users?role=student',
    },
    {
      title: 'Total Classes',
      value: stats.totalClasses || 0,
      description: 'Academic classes',
      icon: <BookOpen className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/admin/classes',
    },
  ];

  const quickActions = [
    {
      title: 'Class Management',
      description: 'Organize groups and classes',
      icon: <FolderTree className="h-5 w-5" />,
      href: '/dashboard/admin/class-groups',
    },
    {
      title: 'Teacher Resources',
      description: 'Manage staff and assignments',
      icon: <Users className="h-5 w-5" />,
      href: '/dashboard/admin/teachers',
    },
    {
      title: 'Scheduling Hub',
      description: 'Create and manage timetables',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/admin/scheduling',
    },
    {
      title: 'Subject Library',
      description: 'Curriculum and subjects',
      icon: <BookText className="h-5 w-5" />,
      href: '/dashboard/admin/subjects',
    },
  ];

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">
          {schoolName ? `${schoolName} Dashboard` : 'School Dashboard'}
        </h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Monitor school performance, resolve outstanding tasks, and access the tools you need to keep operations running smoothly.
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
                Pending actions
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Stay ahead by resolving the most time-sensitive items
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
                      <Users className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black">3 pending user registrations</p>
                      <p className="text-xs text-gray-500">Awaiting your review and role assignment</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-gray-300">
                      <Link href="/dashboard/admin/users?tab=pending">Review</Link>
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black">Timetable conflicts detected</p>
                      <p className="text-xs text-gray-500">Two overlapping class assignments</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-gray-300">
                      <Link href="/dashboard/admin/scheduling/timetables">Fix</Link>
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black">Academic year setup</p>
                      <p className="text-xs text-gray-500">Prepare structure for 2025-2026</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-gray-300">
                      <Link href="/dashboard/admin/class-groups">Setup</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold text-black">Recent activity</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Highlights from the past few days across your school
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
                      <Users className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">New teacher approved and assigned</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">New class “CM2 A” created</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">Mathematics subject updated</p>
                      <p className="text-xs text-gray-500">2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <Clock className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">Timetable published for next week</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
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
