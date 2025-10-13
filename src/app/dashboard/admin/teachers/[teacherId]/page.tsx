'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User, BookOpen, GraduationCap, Clock, Calendar, ArrowRight, Mail, Users } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';

interface TeacherDetail {
  teacher: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  subjects: Array<{
    id: string;
    name: string;
    code?: string;
    weeklyHours?: number;
  }>;
  classesBySubject: Array<{
    id: string;
    name: string;
    code?: string;
    classes: Array<{
      id: string;
      name: string;
      academicYear: string;
    }>;
  }>;
  availability: Record<string, Array<{
    id: string;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    notes?: string;
  }>>;
  statistics: {
    totalSubjects: number;
    totalClasses: number;
    uniqueClasses: number;
  };
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminTeacherDetailPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [teacherDetail, setTeacherDetail] = useState<TeacherDetail | null>(null);

  const fetchTeacherDetail = async () => {
    if (!teacherId || !session?.user?.schoolId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setTeacherDetail(data);
      } else {
        throw new Error('Failed to fetch teacher details');
      }
    } catch (error: any) {
      console.error('Error fetching teacher details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load teacher details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherDetail();
  }, [teacherId, session?.user?.schoolId]);

  if (loading) {
    return (
      <div className="space-y-10">
        <header className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
        </header>
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full animate-pulse rounded bg-gray-200" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!teacherDetail) {
    return (
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold text-black">Teacher Not Found</h1>
        <p className="text-gray-600">The requested teacher could not be found or you do not have permission to view their profile.</p>
        <Link href="/dashboard/admin/teachers">
          <Button>Back to Teachers</Button>
        </Link>
      </div>
    );
  }

  const { teacher, subjects, classesBySubject, availability, statistics } = teacherDetail;

  const breadcrumbs = [
    ...createBreadcrumbs.teachers(),
    { label: teacher.name, icon: <User className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <User className="h-8 w-8 text-gray-600" />
              {teacher.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {teacher.email}
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                Teacher
              </span>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/teachers">
              View All Teachers <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Subjects Taught</p>
                  <p className="text-3xl font-semibold text-black">{statistics.totalSubjects}</p>
                </div>
                <BookOpen className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                  <p className="text-3xl font-semibold text-black">{statistics.totalClasses}</p>
                </div>
                <Users className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Classes</p>
                  <p className="text-3xl font-semibold text-black">{statistics.uniqueClasses}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Teacher Profile
              </CardTitle>
              <CardDescription>
                Basic information about {teacher.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Full Name</label>
                  <p className="text-lg text-black">{teacher.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email Address</label>
                  <p className="text-lg text-black">{teacher.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Role</label>
                  <p className="text-lg text-black capitalize">{teacher.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Teaching Load</label>
                  <p className="text-lg text-black">
                    {statistics.totalSubjects} subject{statistics.totalSubjects !== 1 ? 's' : ''} across {statistics.uniqueClasses} class{statistics.uniqueClasses !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black">Subjects Taught</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/admin/subjects">
                View All Subjects <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {subjects.length === 0 ? (
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects assigned</h3>
                <p className="text-gray-600">This teacher hasn't been assigned to teach any subjects yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => (
                <Card key={subject.id} className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-black">
                      <Link
                        href={`/dashboard/admin/subjects/${subject.id}`}
                        className="hover:text-gray-600 transition-colors"
                      >
                        {subject.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      {subject.code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subject.weeklyHours && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Clock className="h-4 w-4" />
                        {subject.weeklyHours} hours per week
                      </div>
                    )}
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={`/dashboard/admin/subjects/${subject.id}`}>
                        View Subject Details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black">Classes & Subjects</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/admin/classes">
                View All Classes <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {classesBySubject.length === 0 ? (
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center">
                <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No class assignments</h3>
                <p className="text-gray-600">This teacher hasn't been assigned to any classes yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {classesBySubject.map((subjectGroup) => (
                <Card key={subjectGroup.id} className="rounded-xl border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {subjectGroup.name}
                      {subjectGroup.code && (
                        <span className="text-sm font-normal text-gray-500">({subjectGroup.code})</span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Teaching {subjectGroup.classes.length} class{subjectGroup.classes.length !== 1 ? 'es' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {subjectGroup.classes.map((classItem) => (
                        <div key={classItem.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <Link
                              href={`/dashboard/admin/classes/${classItem.id}`}
                              className="font-medium text-black hover:text-gray-600 transition-colors"
                            >
                              {classItem.name}
                            </Link>
                            <p className="text-sm text-gray-500">{classItem.academicYear}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black">Weekly Availability</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/admin/teachers/${teacherId}/availability`}>
                Manage Availability <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {Object.keys(availability).length === 0 ? (
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No availability set</h3>
                <p className="text-gray-600">This teacher hasn't set their availability schedule yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dayOrder.map((day) => {
                const dayAvailability = availability[day] || [];
                return (
                  <Card key={day} className="rounded-xl border border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-black">{day}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dayAvailability.length === 0 ? (
                        <p className="text-sm text-gray-500">Not available</p>
                      ) : (
                        <div className="space-y-2">
                          {dayAvailability.map((slot, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              {slot.isRecurring && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Weekly
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timetable" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black">Weekly Timetable</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/admin/scheduling/timetables">
                View All Timetables <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Timetable Coming Soon</h3>
              <p className="text-gray-600 mb-4">
                The auto-generated timetable for {teacher.name} will be available here once the scheduling system is complete.
              </p>
              <Button asChild>
                <Link href="/dashboard/admin/scheduling">
                  Go to Scheduling Hub
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
