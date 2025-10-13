'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, Settings, FolderTree, Calendar, LayoutDashboard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ClassForm } from '@/components/forms/class-form';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';

interface ClassDetail {
  id: string;
  name: string;
  academicYear: string;
  academicLevelId: string;
  description?: string;
  studentCount: number;
  subjectCount: number;
  teacherCount: number;
}

export default function AdminClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');

  const fetchClassDetail = async () => {
    if (!classId || !session?.user?.schoolId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}`);
      if (response.ok) {
        const data = await response.json();
        setClassDetail(data);
      } else {
        throw new Error('Failed to fetch class details');
      }
    } catch (error: any) {
      console.error('Error fetching class details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load class details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetail();
  }, [classId, session?.user?.schoolId]);

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

  if (!classDetail) {
    return (
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold text-black">Class Not Found</h1>
        <p className="text-gray-600">The requested class could not be found or you do not have permission to view it.</p>
        <Link href="/dashboard/admin/classes">
          <Button>Back to Classes</Button>
        </Link>
      </div>
    );
  }

  const breadcrumbs = [
    ...createBreadcrumbs.classes(),
    { label: classDetail.name, icon: <BookOpen className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-gray-600" />
              {classDetail.name}
            </h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Manage subjects, teachers, and students for this class
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/classes">
              View All Classes <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </header>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Settings className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="subjects">
            <BookOpen className="h-4 w-4 mr-2" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="teachers">
            <Users className="h-4 w-4 mr-2" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="timetable">
            <Calendar className="h-4 w-4 mr-2" />
            Timetable
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Class Details</CardTitle>
              <CardDescription>Edit class information and academic year.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassForm
                classData={classDetail}
                onSuccess={() => {
                  fetchClassDetail();
                  toast({ title: 'Success', description: 'Class updated successfully.' });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="subjects" className="pt-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Assigned Subjects</CardTitle>
              <CardDescription>Manage subjects taught in {classDetail.name} and their weekly quotas.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Implement ClassSubjectsTable component */}
              <p>Subject management UI for {classDetail.name} coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teachers" className="pt-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Assigned Teachers</CardTitle>
              <CardDescription>Assign teachers to subjects for {classDetail.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Implement ClassTeachersTable component */}
              <p>Teacher assignment UI for {classDetail.name} coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timetable" className="pt-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Timetable for {classDetail.name}</CardTitle>
              <CardDescription>View, edit, or auto-generate the weekly schedule.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Jump to the full scheduling interface for this class:</p>
              <Link href={`/dashboard/admin/scheduling/timetables?classId=${classId}`} passHref>
                <Button className="bg-black hover:bg-gray-800">
                  <Calendar className="h-4 w-4 mr-2" />
                  Go to Timetable Builder
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
