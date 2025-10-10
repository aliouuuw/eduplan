'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { School, Users, BookOpen, Calendar } from 'lucide-react';
import { DashboardStats } from '@/lib/types';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual stats from API
    // For now, using mock data
    setTimeout(() => {
      setStats({
        totalSchools: 12,
        totalUsers: 1250,
        totalClasses: 180,
        totalSubjects: 45,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const statCards = [
    {
      title: 'Total Schools',
      value: stats.totalSchools || 0,
      description: 'Active schools in the system',
      icon: <School className="h-4 w-4 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      description: 'All users across all schools',
      icon: <Users className="h-4 w-4 text-green-600" />,
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'Total Classes',
      value: stats.totalClasses || 0,
      description: 'Classes across all schools',
      icon: <BookOpen className="h-4 w-4 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200',
    },
    {
      title: 'Total Subjects',
      value: stats.totalSubjects || 0,
      description: 'Subjects taught across all schools',
      icon: <Calendar className="h-4 w-4 text-orange-600" />,
      color: 'bg-orange-50 border-orange-200',
    },
  ];

  return (
    <DashboardLayout 
      title="Superadmin Dashboard" 
      description="System-wide overview and management"
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className={`${stat.color}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    stat.value.toLocaleString()
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Schools</CardTitle>
              <CardDescription>
                Recently created schools in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                      <div className="space-y-1 flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <School className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">École Primaire Dakar</p>
                      <p className="text-xs text-gray-500">Created 2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <School className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Lycée Thiès</p>
                      <p className="text-xs text-gray-500">Created 1 week ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <School className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Collège Saint-Louis</p>
                      <p className="text-xs text-gray-500">Created 2 weeks ago</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>
                Recent activity across all schools
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      <div className="space-y-1 flex-1">
                        <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">New teacher registered at École Primaire Dakar</p>
                      <p className="text-xs text-gray-500">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-green-100 rounded flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">New class created at Lycée Thiès</p>
                      <p className="text-xs text-gray-500">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-purple-100 rounded flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">Timetable updated at Collège Saint-Louis</p>
                      <p className="text-xs text-gray-500">3 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-orange-100 rounded flex items-center justify-center">
                      <School className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">New school registration pending approval</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
