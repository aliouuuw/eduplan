'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Hash, FileText } from 'lucide-react';
import { SubjectForm } from '@/components/forms/subject-form';
import type { Subject } from '@/lib/db';

export default function AdminSubjectsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const fetchSubjects = async () => {
    if (!session?.user?.schoolId) return;

    try {
      const response = await fetch(`/api/subjects?schoolId=${session.user.schoolId}`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [session?.user?.schoolId]);

  const handleCreateSubject = async (data: any) => {
    try {
      const response = await fetch('/api/subjects', {
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
          description: 'Subject created successfully',
        });
        setShowForm(false);
        fetchSubjects();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error creating subject:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create subject',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubject = async (data: any) => {
    if (!editingSubject) return;

    try {
      const response = await fetch(`/api/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Subject updated successfully',
        });
        setShowForm(false);
        setEditingSubject(null);
        fetchSubjects();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error updating subject:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update subject',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Subject deleted successfully',
        });
        fetchSubjects();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete subject',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      key: 'name' as keyof Subject,
      label: 'Subject Name',
      render: (_value: any, item: Subject) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-gray-700" />
          </div>
          <span className="font-medium text-black">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'code' as keyof Subject,
      label: 'Code',
      render: (_value: any, item: Subject) => (
        <div className="flex items-center space-x-2">
          <Hash className="h-4 w-4 text-gray-500" />
          <Badge variant="outline" className="border-gray-300 text-gray-700">
            {item.code || 'N/A'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'description' as keyof Subject,
      label: 'Description',
      render: (_value: any, item: Subject) => (
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600 max-w-xs truncate">
            {item.description || 'No description'}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt' as keyof Subject,
      label: 'Created',
      render: (_value: any, item: Subject) => (
        <span className="text-sm text-gray-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'id' as keyof Subject,
      label: 'Actions',
      render: (_value: any, item: Subject) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingSubject(item);
              setShowForm(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeleteSubject(item.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    totalSubjects: subjects.length,
    withCodes: subjects.filter(s => s.code).length,
    withDescriptions: subjects.filter(s => s.description).length,
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">Subjects</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Create and manage academic subjects taught in your school
        </p>
      </header>

      <section className="space-y-4">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Subjects</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <BookOpen className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.totalSubjects}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">With Codes</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <Hash className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.withCodes}</p>
                <p className="text-xs text-gray-500">Subjects with unique identifiers</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Documented</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <FileText className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.withDescriptions}</p>
                <p className="text-xs text-gray-500">Subjects with descriptions</p>
              </CardContent>
            </Card>
          </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 border-b border-gray-200 pb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-black">All Subjects</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Maintain a rich and accurate subject library with codes, descriptions, and ownership.
                </CardDescription>
              </div>
              <Button onClick={() => setShowForm(true)} className="bg-black hover:bg-gray-800 sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={subjects}
              loading={loading}
              searchPlaceholder="Search subjects..."
            />
          </CardContent>
      </section>

      <SubjectForm
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setEditingSubject(null);
          }}
          subject={editingSubject}
          onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject}
          loading={false}
        />
    </div>
  );
}
