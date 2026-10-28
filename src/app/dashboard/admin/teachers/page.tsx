'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, AlertCircle, Plus, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';
import { TeacherCapacityBar } from '@/components/teacher-capacity-bar';
import { TeacherStatusBadge, getTeacherStatus } from '@/components/teacher-status-badge';
import type { TeacherMetrics } from '@/lib/teacher-utils';

type FilterType = 'all' | 'has-availability' | 'no-availability' | 'available' | 'overallocated';
type SortType = 'name' | 'workload-asc' | 'workload-desc' | 'capacity-desc' | 'utilization-asc';

export default function AdminTeachersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<TeacherMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('name');

  useEffect(() => {
    if (session?.user) {
      fetchTeachers();
    }
  }, [session]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teachers/stats?schoolId=${session?.user?.schoolId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      } else {
        throw new Error('Failed to fetch teachers');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teachers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTeachers = (teachers: TeacherMetrics[]): TeacherMetrics[] => {
    return teachers.filter((teacher) => {
      switch (filter) {
        case 'has-availability':
          return teacher.availability.hasAvailability;
        case 'no-availability':
          return !teacher.availability.hasAvailability;
        case 'available':
          return teacher.availability.hasAvailability && teacher.capacity.utilizationPercentage < 75;
        case 'overallocated':
          return teacher.capacity.isOverallocated;
        default:
          return true;
      }
    });
  };

  const sortTeachers = (teachers: TeacherMetrics[]): TeacherMetrics[] => {
    return [...teachers].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.teacherName.localeCompare(b.teacherName);
        case 'workload-asc':
          return a.workload.totalWeeklyHours - b.workload.totalWeeklyHours;
        case 'workload-desc':
          return b.workload.totalWeeklyHours - a.workload.totalWeeklyHours;
        case 'capacity-desc':
          return b.capacity.availableHours - a.capacity.availableHours;
        case 'utilization-asc':
          return a.capacity.utilizationPercentage - b.capacity.utilizationPercentage;
        default:
          return 0;
      }
    });
  };

  const filteredAndSortedTeachers = sortTeachers(filterTeachers(teachers));

  const stats = {
    total: teachers.length,
    withAvailability: teachers.filter(t => t.availability.hasAvailability).length,
    available: teachers.filter(t => t.availability.hasAvailability && t.capacity.utilizationPercentage < 75).length,
    overallocated: teachers.filter(t => t.capacity.isOverallocated).length,
  };

  const breadcrumbs = createBreadcrumbs.teachers();

  if (loading) {
    return (
      <div className="space-y-8">
        <Breadcrumbs items={breadcrumbs} />
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <Users className="h-8 w-8 text-gray-600" />
              Teachers
            </h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Manage teacher capacity, assignments, and availability
            </p>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Teachers</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>With Availability</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.withAvailability}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Available Capacity</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.available}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Overallocated</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.overallocated}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Sort */}
      <Card className="rounded-2xl border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers ({teachers.length})</SelectItem>
                  <SelectItem value="has-availability">Has Availability ({stats.withAvailability})</SelectItem>
                  <SelectItem value="no-availability">No Availability ({stats.total - stats.withAvailability})</SelectItem>
                  <SelectItem value="available">Available (&lt; 75%) ({stats.available})</SelectItem>
                  <SelectItem value="overallocated">Overallocated ({stats.overallocated})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-600" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="workload-asc">Workload (Low to High)</SelectItem>
                  <SelectItem value="workload-desc">Workload (High to Low)</SelectItem>
                  <SelectItem value="capacity-desc">Capacity (Most Available)</SelectItem>
                  <SelectItem value="utilization-asc">Utilization (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Teachers Grid */}
      {filteredAndSortedTeachers.length === 0 ? (
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No teachers match the selected filters</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setFilter('all')}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedTeachers.map((teacher) => (
            <Card key={teacher.teacherId} className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-black">
                      <Link
                        href={`/dashboard/admin/teachers/${teacher.teacherId}`}
                        className="hover:text-gray-600 transition-colors"
                      >
                        {teacher.teacherName}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">
                      {teacher.teacherEmail}
                    </CardDescription>
                  </div>
                  <TeacherStatusBadge 
                    status={getTeacherStatus(teacher)} 
                    variant="compact"
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Capacity Bar */}
                {teacher.availability.hasAvailability ? (
                  <TeacherCapacityBar
                    workload={teacher.workload.totalWeeklyHours}
                    availability={teacher.availability.totalWeeklyHours}
                    utilization={teacher.capacity.utilizationPercentage}
                    variant="compact"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>No availability schedule set</span>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-900">{teacher.workload.totalWeeklyHours}h</div>
                    <div className="text-gray-500">Workload</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-900">
                      {teacher.availability.hasAvailability 
                        ? `${Math.round(teacher.capacity.availableHours * 10) / 10}h`
                        : '-'}
                    </div>
                    <div className="text-gray-500">Free</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-900">
                      {teacher.availability.hasAvailability 
                        ? `${teacher.capacity.utilizationPercentage}%`
                        : '-'}
                    </div>
                    <div className="text-gray-500">Usage</div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{teacher.workload.classCount} classes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{teacher.qualifications.count} subjects</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {!teacher.availability.hasAvailability && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/dashboard/admin/teachers/${teacher.teacherId}/availability`}>
                        <Plus className="h-3 w-3 mr-1" />
                        Set Availability
                      </Link>
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="default"
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/dashboard/admin/teachers/${teacher.teacherId}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
