'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useToast } from '@/hooks/use-toast';
import { Plus, GraduationCap, FolderTree, ArrowRight, BookOpen, Users } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AcademicLevelForm } from '@/components/forms/academic-level-form';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';

interface ClassGroup {
  id: string;
  name: string;
  description?: string;
  classCount: number;
  studentCount: number;
}

export default function AdminClassGroupsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);

  const fetchClassGroups = async () => {
    try {
      const response = await fetch('/api/academic-levels'); // Using existing API route for now
      if (response.ok) {
        const data = await response.json();
        // Assuming API returns academic levels with class/student counts
        setClassGroups(data.academicLevels || []);
      }
    } catch (error) {
      console.error('Error fetching class groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load class groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.schoolId) {
      fetchClassGroups();
    }
  }, [session?.user?.schoolId]);

  const handleEdit = (group: ClassGroup) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this class group? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/academic-levels/${groupId}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: 'Success', description: 'Class group deleted successfully' });
        fetchClassGroups();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete class group');
      }
    } catch (error: any) {
      console.error('Error deleting class group:', error);
      toast({ title: 'Error', description: error.message || 'Failed to delete class group', variant: 'destructive' });
    }
  };

  const handleFormSuccess = () => {
    fetchClassGroups();
    setDialogOpen(false);
    setEditingGroup(null);
  };

  const columns = [
    {
      key: 'name' as keyof ClassGroup,
      label: 'Class Group',
      render: (_value: any, item: ClassGroup) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <FolderTree className="h-4 w-4 text-blue-700" />
          </div>
          <div>
            <p className="font-medium text-black">{item.name}</p>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'classCount' as keyof ClassGroup,
      label: 'Classes',
      render: (_value: any, item: ClassGroup) => (
        <span className="text-sm text-gray-700">{item.classCount || 0}</span>
      ),
    },
    {
      key: 'studentCount' as keyof ClassGroup,
      label: 'Students',
      render: (_value: any, item: ClassGroup) => (
        <span className="text-sm text-gray-700">{item.studentCount || 0}</span>
      ),
    },
    {
      key: 'actions' as string,
      label: 'Actions',
      render: (_value: any, item: ClassGroup) => (
        <div className="flex space-x-2">
          <Link href={`/dashboard/admin/classes?academicLevelId=${item.id}`} passHref>
            <Button size="sm" variant="outline">
              <ArrowRight className="h-4 w-4 mr-2" />
              View Classes
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const breadcrumbs = createBreadcrumbs.classGroups();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-gray-600" />
              Class Groups
            </h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Organize your classes into custom groups (e.g., by academic level, track, or campus)
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingGroup(null)} className="bg-black hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingGroup ? 'Edit Class Group' : 'Create Class Group'}</DialogTitle>
                <DialogDescription>
                  {editingGroup ? 'Edit the class group details.' : 'Add a new class group to your school.'}
                </DialogDescription>
              </DialogHeader>
              <AcademicLevelForm
                academicLevel={editingGroup ? { ...editingGroup, type: 'academic' } : undefined} // type is temporary until schema refactor
                onSuccess={handleFormSuccess}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, index) => (
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
      ) : classGroups.length === 0 ? (
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No class groups yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first class group to organize your academic structure.</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classGroups.map((group) => (
            <Card key={group.id} className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-black">
                  <Link
                    href={`/dashboard/admin/class-groups/${group.id}`}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {group.name}
                  </Link>
                </CardTitle>
                {group.description && (
                  <CardDescription className="text-sm text-gray-600">
                    {group.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <BookOpen className="h-4 w-4" />
                      {group.classCount} classes
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      {group.studentCount} students
                    </span>
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/dashboard/admin/class-groups/${group.id}`}>
                      View Classes
                      <ArrowRight className="h-4 w-4 ml-2" />
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
