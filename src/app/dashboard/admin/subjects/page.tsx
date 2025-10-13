'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Hash, FileText, ArrowRight, Clock } from 'lucide-react';
import { SubjectForm } from '@/components/forms/subject-form';
import type { Subject } from '@/lib/db';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Class } from '@/lib/db'; // Assuming Class type is available or define a minimal interface
import Link from 'next/link';
import { XCircle, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';

interface SubjectWithUsage extends Subject {
  classCount: number;
}

export default function AdminSubjectsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithUsage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [subjectUsage, setSubjectUsage] = useState<{ subjectName: string; classes: Class[] } | null>(null);

  const fetchSubjects = async () => {
    if (!session?.user?.schoolId) return;

    try {
      const response = await fetch(`/api/subjects?schoolId=${session.user.schoolId}`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
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
    // Prevent deletion if subject is used in any classes
    const subject = subjects.find(s => s.id === subjectId);
    if (subject && subject.classCount > 0) {
      toast({
        title: 'Cannot Delete Subject',
        description: `Subject is currently assigned to ${subject.classCount} class(es). Please unassign it first.`,
        variant: 'destructive',
      });
      return;
    }

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

  const handleViewUsage = async (subject: SubjectWithUsage) => {
    // Fetch classes using this subject
    // This would require a new API endpoint, e.g., /api/subjects/[subjectId]/classes
    // For now, mock data or a placeholder.
    try {
      const response = await fetch(`/api/subjects/${subject.id}/classes`); // Assuming this endpoint exists or will be created
      if (response.ok) {
        const data = await response.json();
        setSubjectUsage({ subjectName: subject.name, classes: data.classes || [] });
        setShowUsageDialog(true);
      } else {
        throw new Error('Failed to fetch subject usage');
      }
    } catch (error: any) {
      console.error('Error fetching subject usage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load subject usage details',
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
      key: 'classCount' as keyof SubjectWithUsage,
      label: 'Used In',
      render: (_value: any, item: SubjectWithUsage) => (
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-gray-500" />
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
            {item.classCount} Class{item.classCount !== 1 ? 'es' : ''}
          </Badge>
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
      render: (_value: any, item: SubjectWithUsage) => (
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
          <Button size="sm" variant="outline" onClick={() => handleViewUsage(item)}>
            View Usage
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    totalSubjects: subjects.length,
    withCodes: subjects.filter(s => s.code).length,
    withDescriptions: subjects.filter(s => s.description).length,
    usedInClasses: subjects.filter(s => s.classCount > 0).length,
  };

  const breadcrumbs = createBreadcrumbs.subjects();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-gray-600" />
              Subjects
            </h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Create and manage academic subjects taught in your school. Subjects can be assigned to specific classes.
            </p>
          </div>
          <Button 
            className="bg-black hover:bg-gray-800"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>
      </header>

      <section className="space-y-4">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Used in Classes</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.usedInClasses}</p>
                <p className="text-xs text-gray-500">Subjects assigned to at least one class</p>
              </CardContent>
            </Card>
          </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first academic subject.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Subject
            </Button>
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
                  {subject.code || 'No code'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subject.weeklyHours && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {subject.weeklyHours} hours per week
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <BookOpen className="h-4 w-4" />
                      {subject.classCount} classes
                    </span>
                    {subject.description && (
                      <Badge variant="secondary" className="text-xs">
                        Documented
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/dashboard/admin/subjects/${subject.id}`}>
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

      {/* Subject Usage Dialog */}
      <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Classes Using "{subjectUsage?.subjectName}"</DialogTitle>
            <DialogDescription>
              List of classes where this subject is currently assigned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {subjectUsage?.classes && subjectUsage.classes.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {subjectUsage.classes.map((cls) => (
                  <li key={cls.id} className="text-sm text-gray-700">
                    <Link href={`/dashboard/admin/classes/${cls.id}`} className="text-blue-600 hover:underline">
                      {cls.name} ({cls.academicYear})
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">This subject is not currently assigned to any classes.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowUsageDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
