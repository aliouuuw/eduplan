'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, UserCheck, Calendar, FolderTree, BookText } from 'lucide-react';
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
        const [schoolResponse, statsResponse] = await Promise.all([
          fetch(`/api/schools/${session.user.schoolId}`),
          fetch(`/api/dashboard/admin/stats?schoolId=${session.user.schoolId}`),
        ]);
        if (schoolResponse.ok) {
          const schoolData = await schoolResponse.json();
          setSchoolName(schoolData.name);
        }
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
        <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">
          {schoolName ? `${schoolName} Dashboard` : 'School Dashboard'}
        </h1>
        <p className="max-w-xl text-[13.5px] leading-relaxed text-[#b5aec4]">
          Monitor school performance, resolve outstanding tasks, and access the tools you need to keep operations running smoothly.
        </p>
      </header>

      <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111827]">Overview</h2>
            <span className="text-xs text-[#b5aec4]">Updated moments ago</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat, index) => (
              <Link key={stat.title} href={stat.href} className="group block h-full">
                <article className={`flex h-full flex-col justify-between soft-raised rounded-2xl p-5 transition-[filter] group-hover:brightness-[0.98] ${['bg-[#e8e5ff]', 'bg-[#fff9e6]', 'bg-[#ffe8e8]', 'bg-[#e8f5ed]'][index % 4]}`}>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#1a1a2e]">{stat.title}</p>
                    <div className="text-3xl font-bold text-[#111827]">
                      {loading ? (
                        <div className="h-8 w-16 animate-pulse rounded bg-white/70" />
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-[#7b7590]">{stat.description}</p>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111827]">Quick actions</h2>
            <span className="text-xs text-[#b5aec4]">Jump into the workflows you manage most</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href} className="group block h-full">
                <article className="flex h-full flex-col soft-raised rounded-2xl bg-white p-5 transition-colors group-hover:bg-[#fbfaff]">
                  <h3 className="text-base font-semibold text-[#111827]">{action.title}</h3>
                  <p className="mt-2 text-sm text-[#7b7590]">{action.description}</p>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-bold text-[#111827]">
                Pending actions
              </CardTitle>
              <CardDescription className="text-sm text-[#7b7590]">
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
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f5f2f9] p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#111827]">3 pending user registrations</p>
                      <p className="text-xs text-[#7b7590]">Awaiting your review and role assignment</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/admin/users?tab=pending">Review</Link>
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-[#fff9e6] p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#111827]">Timetable conflicts detected</p>
                      <p className="text-xs text-[#7b7590]">Two overlapping class assignments</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/admin/scheduling/timetables">Fix</Link>
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-[#e8f5ed] p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#111827]">Academic year setup</p>
                      <p className="text-xs text-[#7b7590]">Prepare structure for 2025-2026</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/admin/class-groups">Setup</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-bold text-[#111827]">Recent activity</CardTitle>
              <CardDescription className="text-sm text-[#7b7590]">
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
                  {[
                    ['New teacher approved and assigned', '2 hours ago'],
                    ['New class CM2 A created', '1 day ago'],
                    ['Mathematics subject updated', '2 days ago'],
                    ['Timetable published for next week', '3 days ago'],
                  ].map(([title, when]) => (
                    <div key={title} className="rounded-2xl bg-[#f5f2f9] p-4">
                      <p className="text-sm font-semibold text-[#111827]">{title}</p>
                      <p className="text-xs text-[#7b7590]">{when}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
    </div>
  );
}
