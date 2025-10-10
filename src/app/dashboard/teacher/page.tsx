'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Calendar, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TeacherStats {
  totalSubjects: number;
  totalClasses: number;
  totalStudents: number;
  totalPeriods: number;
}

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<TeacherStats>({
    totalSubjects: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalPeriods: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsResponse = await fetch('/api/dashboard/teacher/stats');
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
      title: 'Assigned Subjects',
      value: stats.totalSubjects,
      description: 'Subjects you teach',
      icon: <BookOpen className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/teacher/classes',
    },
    {
      title: 'My Classes',
      value: stats.totalClasses,
      description: 'Classes you teach',
      icon: <Users className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/teacher/classes',
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      description: 'Students across all classes',
      icon: <Users className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/teacher/classes',
    },
    {
      title: 'Weekly Periods',
      value: stats.totalPeriods,
      description: 'Scheduled teaching periods',
      icon: <Clock className="h-5 w-5 text-gray-700" />,
      href: '/dashboard/teacher/timetable',
    },
  ];

  const quickActions = [
    {
      title: 'View Timetable',
      description: 'Check your teaching schedule',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/teacher/timetable',
    },
    {
      title: 'My Classes',
      description: 'Manage classes and view students',
      icon: <BookOpen className="h-5 w-5" />,
      href: '/dashboard/teacher/classes',
    },
    {
      title: 'Class Lists',
      description: 'View student lists for your classes',
      icon: <Users className="h-5 w-5" />,
      href: '/dashboard/teacher/classes',
    },
    {
      title: 'Schedule Overview',
      description: 'View your weekly teaching load',
      icon: <Clock className="h-5 w-5" />,
      href: '/dashboard/teacher/timetable',
    },
  ];

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">
          Welcome back, {session?.user?.name}
        </h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Access your teaching schedule, manage your classes, and view student information all in one place.
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
          <span className="text-xs text-gray-400">Jump straight to your daily workflows</span>
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
              <Calendar className="h-5 w-5 text-gray-600" />
              Today's Schedule
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Your classes for today
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
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-black text-white text-sm font-semibold">
                    08:00
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black">Mathematics - 6ème A</p>
                    <p className="text-xs text-gray-500">Room 101 • 08:00 - 09:00</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="border-gray-300">
                    <Link href="/dashboard/teacher/timetable">View</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-black text-white text-sm font-semibold">
                    10:00
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black">Mathematics - 5ème B</p>
                    <p className="text-xs text-gray-500">Room 103 • 10:00 - 11:00</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="border-gray-300">
                    <Link href="/dashboard/teacher/timetable">View</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-black text-white text-sm font-semibold">
                    14:00
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black">Physics - 3ème A</p>
                    <p className="text-xs text-gray-500">Lab 2 • 14:00 - 15:00</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="border-gray-300">
                    <Link href="/dashboard/teacher/timetable">View</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-black">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              Quick Info
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Important updates and reminders
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
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">All classes assigned</p>
                    <p className="text-xs text-gray-500">You're teaching {stats.totalClasses} classes this semester</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">{stats.totalStudents} total students</p>
                    <p className="text-xs text-gray-500">Across all your classes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">{stats.totalPeriods} weekly periods</p>
                    <p className="text-xs text-gray-500">Check your timetable for details</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">Academic year 2024-2025</p>
                    <p className="text-xs text-gray-500">Current semester in progress</p>
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

