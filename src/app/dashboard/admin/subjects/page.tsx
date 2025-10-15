'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Hash, FileText, ArrowRight, Clock, Users, AlertCircle, ChevronDown, ChevronRight, User, AlertTriangle } from 'lucide-react';
import { SubjectForm } from '@/components/forms/subject-form';
import type { Subject } from '@/lib/db';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Class } from '@/lib/db'; // Assuming Class type is available or define a minimal interface
import Link from 'next/link';
import { XCircle, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SubjectWithUsage extends Subject {
  classCount: number;
  teacherCount: number;
  availableTeachers?: number;
  totalActualHours?: number;
  assignedClasses?: number;
  coverage?: number;
  classDetails?: {  // NEW
    classId: string;
    className: string;
    teacherId: string | null;
    teacherName: string | null;
    weeklyHours: number | null;
    hasTeacher: boolean;
  }[];
}

export default function AdminSubjectsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithUsage[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
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
        const fetchedSubjects = data.subjects || [];

        // Fetch both availability AND class details for each subject
        const subjectsWithDetails = await Promise.all(
          fetchedSubjects.map(async (subject: SubjectWithUsage) => {
            try {
              // Get available teachers count
              const availResponse = await fetch(`/api/subjects/${subject.id}/available-teachers`);
              let availableCount = 0;
              if (availResponse.ok) {
                const availData = await availResponse.json();
                availableCount = availData.availableTeachers.filter(
                  (t: any) => t.capacity.availableHours > 0
                ).length;
              }

              // Get class-level details
              const classesResponse = await fetch(`/api/subjects/${subject.id}/classes`);
              let classDetails = [];
              if (classesResponse.ok) {
                const classesData = await classesResponse.json();
                classDetails = classesData.classes.map((c: any) => ({
                  classId: c.classId,
                  className: c.className,
                  teacherId: c.teacherId,
                  teacherName: c.teacherName,
                  weeklyHours: c.weeklyHours,
                  hasTeacher: !!c.teacherId,
                }));
              }

              return {
                ...subject,
                availableTeachers: availableCount,
                classDetails
              };
            } catch (e) {
              return subject;
            }
          })
        );

        // Calculate coverage percentage for each subject
        const subjectsWithCoverage = subjectsWithDetails.map(subject => ({
          ...subject,
          coverage: subject.classCount > 0
            ? Math.round(((subject.assignedClasses || 0) / subject.classCount) * 100)
            : 0
        }));

        setSubjects(subjectsWithCoverage);
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

  const toggleRow = (subjectId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
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
      key: 'name',
      label: 'Subject Name',
      render: (_value: any, item: SubjectWithUsage) => (
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRow(item.id)}
            className="p-0 h-auto hover:bg-transparent"
          >
            {expandedRows.has(item.id) ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </Button>
          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-gray-700" />
          </div>
          <span className="font-medium text-black">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (_value: any, item: SubjectWithUsage) => (
        <div className="flex flex-col space-y-1">
          {/* Classes using this subject */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              <span className="font-semibold">{item.classCount}</span>
              <span className="text-gray-600"> {item.classCount === 1 ? 'class' : 'classes'}</span>
            </span>
          </div>

          {/* Total hours across all classes */}
          {(item.totalActualHours || 0) > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600">
                {item.totalActualHours}h/week total
              </span>
            </div>
          )}

          {/* Not in use badge */}
          {item.classCount === 0 && (
            <Badge variant="outline" className="text-xs bg-gray-100 w-fit">
              Not in use
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'teacherCount',
      label: 'Teachers',
      render: (_value: any, item: SubjectWithUsage) => (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <Badge variant="secondary" className={`${
              item.teacherCount === 0
                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                : 'bg-green-100 text-green-800 border-green-300'
            }`}>
              {item.teacherCount} qualified
            </Badge>
          </div>
          {item.availableTeachers !== undefined && item.teacherCount > 0 && (
            <Badge
              variant="outline"
              className={`text-xs ${
                item.availableTeachers === 0 ? 'bg-red-50 text-red-700 border-red-300' :
                item.availableTeachers < item.teacherCount / 2 ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                'bg-green-50 text-green-700 border-green-300'
              }`}
            >
              {item.availableTeachers} available
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'coverage',
      label: 'Coverage',
      render: (_value: any, item: SubjectWithUsage) => {
        const coverage = item.coverage || 0;

        return (
          <div className="space-y-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    coverage === 100 ? 'bg-green-500' :
                    coverage >= 75 ? 'bg-yellow-500' :
                    coverage > 0 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${coverage}%` }}
                />
              </div>
              <span className="text-sm font-medium min-w-[3rem]">
                {coverage}%
              </span>
            </div>

            {/* Status text */}
            <div className="flex items-center gap-1">
              {coverage === 100 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                  ✓ Fully staffed
                </Badge>
              )}
              {coverage > 0 && coverage < 100 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                  {item.assignedClasses || 0}/{item.classCount} staffed
                </Badge>
              )}
              {coverage === 0 && item.classCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
                  ⚠ No teachers
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_value: any, item: SubjectWithUsage) => (
        <div className="flex flex-col gap-1">
          {/* Not in use */}
          {item.classCount === 0 && (
            <Badge variant="outline" className="bg-gray-100 text-gray-600">
              Not in use
            </Badge>
          )}

          {/* Need teachers */}
          {item.classCount > 0 && item.availableTeachers === 0 && (
            <Badge variant="destructive" className="text-xs">
              ⚠ Need teachers
            </Badge>
          )}

          {/* Understaffed */}
          {item.coverage && item.coverage < 100 && item.coverage > 0 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
              Understaffed
            </Badge>
          )}

          {/* Good status */}
          {item.coverage === 100 && item.availableTeachers && item.availableTeachers > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
              ✓ Healthy
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_value: any, item: SubjectWithUsage) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="default"
            asChild
          >
            <Link href={`/dashboard/admin/subjects/${item.id}`}>
              <ArrowRight className="h-4 w-4 mr-1" />
              Details
            </Link>
          </Button>
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
          <Button size="sm" variant="outline" onClick={() => handleViewUsage(item)}>
            Usage
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    // Problem indicators
    criticalIssues: subjects.filter(s =>
      s.classCount > 0 && (s.coverage === 0 || s.availableTeachers === 0)
    ).length,

    partiallyStaffed: subjects.filter(s =>
      (s.coverage || 0) > 0 && (s.coverage || 0) < 100
    ).length,

    // Health indicators
    fullyStaffed: subjects.filter(s => s.coverage === 100).length,

    totalActive: subjects.filter(s => s.classCount > 0).length,

    // Capacity indicator
    teacherUtilization: (() => {
      const totalAvailable = subjects.reduce((sum, s) => sum + (s.availableTeachers || 0), 0);
      const totalQualified = subjects.reduce((sum, s) => sum + s.teacherCount, 0);
      return totalQualified > 0 ? Math.round((totalAvailable / totalQualified) * 100) : 0;
    })(),
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* PROBLEM: Critical Issues */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="rounded-2xl border-2 border-red-200 shadow-sm cursor-help">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-red-600">
                        Critical Issues
                      </CardTitle>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-red-600">{stats.criticalIssues}</p>
                      <p className="text-xs text-gray-600 mt-1">No teachers or coverage</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Critical Issues:</strong> Subjects with either 0% teacher coverage or no qualified teachers available.
                    These need immediate attention to ensure classes can run.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* PROBLEM: Partially Staffed */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="rounded-2xl border border-yellow-200 shadow-sm cursor-help">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-yellow-600">
                        Needs Attention
                      </CardTitle>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-100">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-yellow-600">{stats.partiallyStaffed}</p>
                      <p className="text-xs text-gray-600 mt-1">Partially staffed subjects</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Needs Attention:</strong> Subjects where some classes have teachers but not all.
                    Coverage is between 1-99%. Click to expand and see which classes need teachers.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* HEALTH: Fully Staffed */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="rounded-2xl border border-green-200 shadow-sm cursor-help">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-green-600">
                        Fully Staffed
                      </CardTitle>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-green-600">{stats.fullyStaffed}</p>
                      <p className="text-xs text-gray-600 mt-1">Complete coverage</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Fully Staffed:</strong> Subjects with 100% teacher coverage across all classes.
                    All classes using these subjects have assigned teachers.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* OVERVIEW: Active Subjects */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="rounded-2xl border border-gray-200 shadow-sm cursor-help">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Active Subjects
                      </CardTitle>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                        <BookOpen className="h-4 w-4 text-gray-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-black">
                        {stats.totalActive} / {subjects.length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">In use this year</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Active Subjects:</strong> Shows how many subjects are currently assigned to classes this year
                    vs. total subjects in your catalog. Inactive subjects aren't being taught.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* CAPACITY: Teacher Availability */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="rounded-2xl border border-gray-200 shadow-sm cursor-help">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Teacher Capacity
                      </CardTitle>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                        <Users className="h-4 w-4 text-gray-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold text-black">{stats.teacherUtilization}%</p>
                      <p className="text-xs text-gray-600 mt-1">Teachers with capacity</p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Teacher Capacity:</strong> Percentage of qualified teachers who have available hours
                    to take on more classes. Low % means most teachers are at capacity and you may need to hire more.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
      </section>

      {loading ? (
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardContent className="p-8">
            <div className="space-y-4">
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-32 w-full animate-pulse rounded bg-gray-200" />
            </div>
          </CardContent>
        </Card>
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
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>

          {/* Custom table with expandable rows */}
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Subject Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Teachers
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Coverage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects
                    .filter(subject =>
                      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      subject.code?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((subject) => (
                      <React.Fragment key={subject.id}>
                        {/* Main row */}
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {columns.find(c => c.key === 'name')?.render(null, subject)}
                          </td>
                          <td className="px-4 py-3">
                            {columns.find(c => c.key === 'usage')?.render(null, subject)}
                          </td>
                          <td className="px-4 py-3">
                            {columns.find(c => c.key === 'teacherCount')?.render(null, subject)}
                          </td>
                          <td className="px-4 py-3">
                            {columns.find(c => c.key === 'coverage')?.render(null, subject)}
                          </td>
                          <td className="px-4 py-3">
                            {columns.find(c => c.key === 'status')?.render(null, subject)}
                          </td>
                          <td className="px-4 py-3">
                            {columns.find(c => c.key === 'id')?.render(null, subject)}
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {expandedRows.has(subject.id) && subject.classDetails && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="ml-8 space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  Classes using {subject.name}:
                                </h4>
                                {subject.classDetails.length === 0 ? (
                                  <p className="text-sm text-gray-500">No classes assigned</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subject.classDetails.map((classDetail) => (
                                      <Card key={classDetail.classId} className="p-3 border border-gray-200">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <Link
                                              href={`/dashboard/admin/classes/${classDetail.classId}`}
                                              className="text-sm font-medium text-blue-600 hover:underline"
                                            >
                                              {classDetail.className}
                                            </Link>
                                            <div className="mt-1 space-y-1">
                                              {classDetail.hasTeacher ? (
                                                <>
                                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                                    <User className="h-3 w-3" />
                                                    {classDetail.teacherName}
                                                  </div>
                                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                                    <Clock className="h-3 w-3" />
                                                    {classDetail.weeklyHours}h/week
                                                  </div>
                                                </>
                                              ) : (
                                                <Badge variant="destructive" className="text-xs">
                                                  No teacher assigned
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          {!classDetail.hasTeacher && subject.availableTeachers && subject.availableTeachers > 0 && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                // Navigate to class detail page to assign teacher
                                                window.location.href = `/dashboard/admin/classes/${classDetail.classId}`;
                                              }}
                                              className="ml-2"
                                            >
                                              Assign
                                            </Button>
                                          )}
                                        </div>
                                      </Card>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
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
