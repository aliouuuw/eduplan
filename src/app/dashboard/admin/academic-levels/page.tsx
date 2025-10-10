'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, GraduationCap, BookOpen } from 'lucide-react';
import { AcademicLevelForm } from '@/components/forms/academic-level-form';
import type { AcademicLevel } from '@/lib/db';

export default function AdminAcademicLevelsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [classesCount, setClassesCount] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AcademicLevel | null>(null);

  const fetchData = async () => {
    if (!session?.user?.schoolId) return;

    try {
      const [levelsResponse, classesResponse] = await Promise.all([
        fetch(`/api/academic-levels?schoolId=${session.user.schoolId}`),
        fetch(`/api/classes?schoolId=${session.user.schoolId}`)
      ]);

      if (levelsResponse.ok) {
        const levelsData = await levelsResponse.json();
        setLevels(levelsData.levels);
      }

      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        // Count classes per level
        const countMap: Record<string, number> = {};
        classesData.classes.forEach((cls: any) => {
          countMap[cls.levelId] = (countMap[cls.levelId] || 0) + 1;
        });
        setClassesCount(countMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load academic levels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session?.user?.schoolId]);

  const handleCreateLevel = async (data: any) => {
    try {
      const response = await fetch('/api/academic-levels', {
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
          description: 'Academic level created successfully',
        });
        setShowForm(false);
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error creating level:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create academic level',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateLevel = async (data: any) => {
    if (!editingLevel) return;

    try {
      const response = await fetch(`/api/academic-levels/${editingLevel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Academic level updated successfully',
        });
        setShowForm(false);
        setEditingLevel(null);
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error updating level:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update academic level',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    const classCount = classesCount[levelId] || 0;
    if (classCount > 0) {
      alert(`Cannot delete this academic level because it has ${classCount} class(es) assigned to it. Please reassign or delete the classes first.`);
      return;
    }

    if (!confirm('Are you sure you want to delete this academic level? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/academic-levels/${levelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Academic level deleted successfully',
        });
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error deleting level:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete academic level',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      key: 'name' as keyof AcademicLevel,
      label: 'Level Name',
      render: (_value: any, item: AcademicLevel) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-gray-700" />
          </div>
          <span className="font-medium text-black">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'description' as keyof AcademicLevel,
      label: 'Description',
      render: (_value: any, item: AcademicLevel) => (
        <span className="text-sm text-gray-600">
          {item.description || 'No description'}
        </span>
      ),
    },
    {
      key: 'classes' as any,
      label: 'Classes',
      render: (_value: any, item: AcademicLevel) => {
        const count = classesCount[item.id] || 0;
        return (
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700">{count} class{count !== 1 ? 'es' : ''}</span>
          </div>
        );
      },
    },
    {
      key: 'createdAt' as keyof AcademicLevel,
      label: 'Created',
      render: (_value: any, item: AcademicLevel) => (
        <span className="text-sm text-gray-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions' as any,
      label: 'Actions',
      render: (_value: any, item: AcademicLevel) => {
        const classCount = classesCount[item.id] || 0;
        return (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingLevel(item);
                setShowForm(true);
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDeleteLevel(item.id)}
              disabled={classCount > 0}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  const stats = {
    totalLevels: levels.length,
    totalClasses: Object.values(classesCount).reduce((sum, count) => sum + count, 0),
    withDescriptions: levels.filter(l => l.description).length,
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">Academic Levels</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Define and manage the academic levels in your school
        </p>
      </header>

      <section className="space-y-4">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Levels
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.totalLevels}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Classes
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <BookOpen className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.totalClasses}</p>
                <p className="text-xs text-gray-500">Across all levels</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Documented Levels
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <BookOpen className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.withDescriptions}</p>
                <p className="text-xs text-gray-500">Include descriptions</p>
              </CardContent>
            </Card>
          </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 border-b border-gray-200 pb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-black">All Academic Levels</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  View, update, or remove levels to keep your academic model aligned with classroom reality.
                </CardDescription>
              </div>
              <Button onClick={() => setShowForm(true)} className="bg-black hover:bg-gray-800 sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Level
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={levels}
              loading={loading}
              searchPlaceholder="Search academic levels..."
            />
          </CardContent>
      </section>

      <AcademicLevelForm
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setEditingLevel(null);
          }}
          level={editingLevel}
          onSubmit={editingLevel ? handleUpdateLevel : handleCreateLevel}
          loading={false}
        />
    </div>
  );
}
