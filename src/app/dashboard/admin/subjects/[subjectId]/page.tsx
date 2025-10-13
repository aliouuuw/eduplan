'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, GraduationCap, ArrowRight, Clock, BookText } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';

interface SubjectDetail {
  subject: {
    id: string;
    name: string;
    code?: string;
    description?: string;
    weeklyHours?: number;
  };
  classes: Array<{
    id: string;
    name: string;
    academicYear: string;
    capacity: number;
    studentCount: number;
  }>;
  teachers: Array<{
    id: string;
    name: string;
    email: string;
    classes: Array<{
      id: string;
      name: string;
      academicYear: string;
    }>;
  }>;
  statistics: {
    totalClasses: number;
    totalTeachers: number;
    totalCapacity: number;
  };
}

export default function AdminSubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [subjectDetail, setSubjectDetail] = useState<SubjectDetail | null>(null);

  const fetchSubjectDetail = async () => {
    if (!subjectId || !session?.user?.schoolId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/subjects/${subjectId}/details`);
      if (response.ok) {
        const data = await response.json();
        setSubjectDetail(data);
      } else {
        throw new Error('Failed to fetch subject details');
      }
    } catch (error: any) {
      console.error('Error fetching subject details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load subject details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectDetail();
  }, [subjectId, session?.user?.schoolId]);

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

  if (!subjectDetail) {
    return (
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold text-black">Subject Not Found</h1>
        <p className="text-gray-600">The requested subject could not be found or you do not have permission to view it.</p>
        <Link href="/dashboard/admin/subjects">
          <Button>Back to Subjects</Button>
        </Link>
      </div>
    );
  }

  const { subject, classes, teachers, statistics } = subjectDetail;

  const breadcrumbs = [
    ...createBreadcrumbs.subjects(),
    { label: subject.name, icon: <BookText className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <BookText className="h-8 w-8 text-gray-600" />
              {subject.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {subject.code && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  Code: {subject.code}
                </span>
              )}
              {subject.weeklyHours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {subject.weeklyHours}h/week
                </span>
              )}
            </div>
            {subject.description && (
              <p className="text-gray-600 max-w-2xl">{subject.description}</p>
            )}
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/subjects">
              View All Subjects <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classes</p>
                  <p className="text-3xl font-semibold text-black">{statistics.totalClasses}</p>
                </div>
                <BookOpen className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                  <p className="text-3xl font-semibold text-black">{statistics.totalTeachers}</p>
                </div>
                <Users className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Capacity</p>
                  <p className="text-3xl font-semibold text-black">{statistics.totalCapacity}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Classes Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">Classes Using This Subject</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/admin/classes">
              View All Classes <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {classes.length === 0 ? (
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No classes assigned</h3>
              <p className="text-gray-600 mb-4">This subject hasn't been assigned to any classes yet.</p>
              <Button asChild>
                <Link href="/dashboard/admin/classes">
                  Assign to Classes
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <Card key={classItem.id} className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-black">
                    <Link
                      href={`/dashboard/admin/classes/${classItem.id}`}
                      className="hover:text-gray-600 transition-colors"
                    >
                      {classItem.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {classItem.academicYear}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {classItem.studentCount} students
                    </span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      Capacity: {classItem.capacity}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={`/dashboard/admin/classes/${classItem.id}`}>
                        View Class Details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Teachers Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">Teachers Teaching This Subject</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/admin/teachers">
              View All Teachers <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {teachers.length === 0 ? (
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers assigned</h3>
              <p className="text-gray-600 mb-4">No teachers are currently assigned to teach this subject.</p>
              <Button asChild>
                <Link href="/dashboard/admin/teachers">
                  Assign Teachers
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher) => (
              <Card key={teacher.id} className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-black">
                    <Link
                      href={`/dashboard/admin/teachers/${teacher.id}`}
                      className="hover:text-gray-600 transition-colors"
                    >
                      {teacher.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {teacher.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Teaching in {teacher.classes.length} class{teacher.classes.length !== 1 ? 'es' : ''}:
                    </p>
                    <div className="space-y-1">
                      {teacher.classes.slice(0, 3).map((classItem) => (
                        <div key={classItem.id} className="text-xs text-gray-500 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {classItem.name}
                        </div>
                      ))}
                      {teacher.classes.length > 3 && (
                        <div className="text-xs text-gray-400">
                          +{teacher.classes.length - 3} more classes
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={`/dashboard/admin/teachers/${teacher.id}`}>
                        View Teacher Profile
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
