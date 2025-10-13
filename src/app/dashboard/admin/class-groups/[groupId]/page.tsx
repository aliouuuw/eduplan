'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, GraduationCap, FolderTree, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';

interface ClassGroupDetail {
  level: {
    id: string;
    name: string;
    description?: string;
  };
  classes: Array<{
    id: string;
    name: string;
    academicYear: string;
    capacity: number;
    studentCount: number;
    createdAt: string;
  }>;
  statistics: {
    totalClasses: number;
    totalCapacity: number;
    totalStudents: number;
    averageClassSize: number;
  };
}

export default function AdminClassGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [classGroupDetail, setClassGroupDetail] = useState<ClassGroupDetail | null>(null);

  const fetchClassGroupDetail = async () => {
    if (!groupId || !session?.user?.schoolId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/academic-levels/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setClassGroupDetail(data);
      } else {
        throw new Error('Failed to fetch class group details');
      }
    } catch (error: any) {
      console.error('Error fetching class group details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load class group details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassGroupDetail();
  }, [groupId, session?.user?.schoolId]);

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

  if (!classGroupDetail) {
    return (
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold text-black">Class Group Not Found</h1>
        <p className="text-gray-600">The requested class group could not be found or you do not have permission to view it.</p>
        <Link href="/dashboard/admin/class-groups">
          <Button>Back to Class Groups</Button>
        </Link>
      </div>
    );
  }

  const { level, classes, statistics } = classGroupDetail;

  const breadcrumbs = [
    ...createBreadcrumbs.classGroups(),
    { label: level.name, icon: <GraduationCap className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-gray-600" />
              {level.name}
            </h1>
            {level.description && (
              <p className="text-gray-600 max-w-2xl">{level.description}</p>
            )}
          </div>
          <Button asChild>
            <Link href={`/dashboard/admin/classes?levelId=${level.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Class to Group
            </Link>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-3xl font-semibold text-black">{statistics.totalStudents}</p>
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

          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Class Size</p>
                  <p className="text-3xl font-semibold text-black">{statistics.averageClassSize}</p>
                </div>
                <FolderTree className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Classes Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">Classes in {level.name}</h2>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/classes">
              View All Classes <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {classes.length === 0 ? (
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first class to this academic level.</p>
              <Button asChild>
                <Link href={`/dashboard/admin/classes?levelId=${level.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Class
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
                      {classItem.studentCount}/{classItem.capacity} students
                    </span>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={`/dashboard/admin/classes/${classItem.id}`}>
                        View Details
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
