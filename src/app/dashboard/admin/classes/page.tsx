'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Users, Calendar } from 'lucide-react';
import { ClassForm } from '@/components/forms/class-form';
import type { Class } from '@/lib/db';

interface ClassWithLevel extends Class {
  levelName: string;
}

export default function AdminClassesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassWithLevel[]>([]);
  const [academicLevels, setAcademicLevels] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithLevel | null>(null);

  const fetchData = async () => {
    if (!session?.user?.schoolId) return;

    try {
      const [classesResponse, levelsResponse] = await Promise.all([
        fetch(`/api/classes?schoolId=${session.user.schoolId}`),
        fetch(`/api/academic-levels?schoolId=${session.user.schoolId}`)
      ]);

      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData.classes);
      }

      if (levelsResponse.ok) {
        const levelsData = await levelsResponse.json();
        setAcademicLevels(levelsData.levels);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session?.user?.schoolId]);

  const handleCreateClass = async (data: any) => {
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          schoolId: session?.user?.schoolId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Class created successfully',
        });
        setShowForm(false);
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create class',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateClass = async (data: any) => {
    if (!editingClass) return;

    try {
      const response = await fetch(`/api/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Class updated successfully',
        });
        setShowForm(false);
        setEditingClass(null);
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update class',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Class deleted successfully',
        });
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete class',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      key: 'name' as keyof ClassWithLevel,
      label: 'Class Name',
      render: (_value: any, item: ClassWithLevel) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-gray-700" />
          </div>
          <span className="font-medium text-black">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'levelName' as keyof ClassWithLevel,
      label: 'Academic Level',
      render: (_value: any, item: ClassWithLevel) => (
        <Badge variant="outline" className="border-gray-300 text-gray-700">{item.levelName}</Badge>
      ),
    },
    {
      key: 'academicYear' as keyof ClassWithLevel,
      label: 'Academic Year',
      render: (_value: any, item: ClassWithLevel) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700">{item.academicYear}</span>
        </div>
      ),
    },
    {
      key: 'capacity' as keyof ClassWithLevel,
      label: 'Capacity',
      render: (_value: any, item: ClassWithLevel) => (
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700">{item.capacity} students</span>
        </div>
      ),
    },
    {
      key: 'id' as keyof ClassWithLevel,
      label: 'Actions',
      render: (_value: any, item: ClassWithLevel) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingClass(item);
              setShowForm(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeleteClass(item.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    totalClasses: classes.length,
    totalCapacity: classes.reduce((sum, cls) => sum + (cls.capacity || 0), 0),
    uniqueLevels: new Set(classes.map(cls => cls.levelName)).size,
    currentYear: new Set(classes.map(cls => cls.academicYear)).size > 0 ?
      Array.from(new Set(classes.map(cls => cls.academicYear)))[0] : 'N/A'
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">Classes</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Create and manage academic classes in your school
        </p>
      </header>

      <section className="space-y-4">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Classes</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <BookOpen className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.totalClasses}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Capacity</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.totalCapacity}</p>
                <p className="text-xs text-gray-500">Available student seats</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Academic Levels</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <span className="text-sm font-bold">{stats.uniqueLevels}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.uniqueLevels}</p>
                <p className="text-xs text-gray-500">Levels currently active</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Current Year</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <Calendar className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold text-black">{stats.currentYear}</p>
              </CardContent>
            </Card>
          </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 border-b border-gray-200 pb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-black">All Classes</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Manage classrooms, align them with levels, and maintain accurate academic years and capacity.
                </CardDescription>
              </div>
              <Button onClick={() => setShowForm(true)} className="bg-black hover:bg-gray-800 sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={classes}
              loading={loading}
              searchPlaceholder="Search classes..."
            />
          </CardContent>
      </section>

      <ClassForm
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setEditingClass(null);
          }}
          classData={editingClass}
          academicLevels={academicLevels}
          onSubmit={editingClass ? handleUpdateClass : handleCreateClass}
          loading={false}
        />
    </div>
  );
}
