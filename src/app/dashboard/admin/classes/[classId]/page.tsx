'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, Settings, FolderTree, Calendar, LayoutDashboard, ArrowRight, Clock, Edit2, Check, X, Plus, MoreHorizontal, Trash2, Eye, AlertTriangle, Info, Copy, User } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ClassTimetableTab from '@/components/class-timetable-tab';
import { TeacherQualificationBadge } from '@/components/teacher-qualification-badge';
import { CloneSubjectsDialog } from '@/components/dialogs/clone-subjects-dialog';

interface ClassDetail {
  id: string;
  schoolId: string;
  levelId: string;
  name: string;
  academicYear: string;
  capacity: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SubjectAssignment {
  id: string; // Assignment ID
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  subjectDescription: string | null;
  weeklyHours: number | null;
  teacherId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  academicYear: string;
}

interface ClassTeacherAssignment {
  id: string;
  name: string;
  email: string;
  subjects: {
    id: string;
    name: string;
    weeklyHours: number | null;
    academicYear: string;
    assignmentId: string;
  }[];
}

export default function AdminClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');
  const [subjects, setSubjects] = useState<SubjectAssignment[]>([]);
  const [teachers, setTeachers] = useState<ClassTeacherAssignment[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [editingWeeklyHours, setEditingWeeklyHours] = useState<string | null>(null); // Assignment ID being edited
  const [tempWeeklyHours, setTempWeeklyHours] = useState<number>(0);
  const [addSubjectDialogOpen, setAddSubjectDialogOpen] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string, code: string | null}[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<{
    id: string, 
    name: string, 
    email: string,
    isQualified?: boolean,
    workload?: number
  }[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    subjectId: '',
    teacherId: '',
    weeklyHours: 0,
    autoQualify: true
  });
  const [assignmentWarnings, setAssignmentWarnings] = useState<any[]>([]);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [changeTeacherDialog, setChangeTeacherDialog] = useState<{
    open: boolean;
    assignmentId: string;
    subjectId: string;
    subjectName: string;
    currentTeacherId: string;
    currentTeacherName: string;
  }>({ open: false, assignmentId: '', subjectId: '', subjectName: '', currentTeacherId: '', currentTeacherName: '' });
  const [newTeacherId, setNewTeacherId] = useState('NONE');
  const isHydrated = useRef(false);

  const fetchClassDetail = async () => {
    if (!classId || !session?.user?.schoolId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}`);
      if (response.ok) {
        const data = await response.json();
        setClassDetail(data.class);
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

  const fetchSubjects = async () => {
    if (!classId) return;
    setLoadingSubjects(true);
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.assignedSubjects || []);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects',
        variant: 'destructive',
      });
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchTeachers = async () => {
    if (!classId) return;
    setLoadingTeachers(true);
    try {
      const response = await fetch(`/api/classes/${classId}/teachers`);
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teachers',
        variant: 'destructive',
      });
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleStartEditWeeklyHours = (assignmentId: string, currentHours: number) => {
    setEditingWeeklyHours(assignmentId);
    setTempWeeklyHours(currentHours);
  };

  const handleCancelEditWeeklyHours = () => {
    setEditingWeeklyHours(null);
    setTempWeeklyHours(0);
  };

  const handleSaveWeeklyHours = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/teacher-assignments/${assignmentId}?type=class`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyHours: tempWeeklyHours }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Weekly hours updated successfully' });
        setEditingWeeklyHours(null);
        fetchSubjects();
        fetchClassDetail();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update weekly hours');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchAvailableSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      if (response.ok) {
        const data = await response.json();
        const assignedSubjectIds = subjects.map(s => s.subjectId);
        const available = data.subjects.filter((subj: any) => !assignedSubjectIds.includes(subj.id));
        setAvailableSubjects(available);
      }
    } catch (error) {
      console.error('Error fetching available subjects:', error);
    }
  };

  const fetchAvailableTeachers = async (subjectId?: string) => {
    try {
      // Fetch all teachers
      const teachersResponse = await fetch(`/api/users?schoolId=${session?.user?.schoolId}&role=teacher`);
      if (!teachersResponse.ok) return;
      
      const teachersData = await teachersResponse.json();
      const allTeachers = teachersData.users || [];

      // If a subject is selected, fetch qualified teachers
      let qualifiedTeacherIds = new Set<string>();
      if (subjectId) {
        const qualifiedResponse = await fetch(`/api/subjects/${subjectId}/qualified-teachers`);
        if (qualifiedResponse.ok) {
          const qualifiedData = await qualifiedResponse.json();
          qualifiedTeacherIds = new Set(qualifiedData.qualifiedTeachers.map((t: any) => t.id));
        }
      }

      // Fetch workload for each teacher
      const teachersWithDetails = await Promise.all(
        allTeachers.map(async (teacher: any) => {
          let workload = 0;
          try {
            const workloadResponse = await fetch(`/api/teachers/${teacher.id}/workload`);
            if (workloadResponse.ok) {
              const workloadData = await workloadResponse.json();
              workload = workloadData.totalWeeklyHours || 0;
            }
          } catch (e) {
            // Ignore workload errors
          }

          return {
            ...teacher,
            isQualified: subjectId ? qualifiedTeacherIds.has(teacher.id) : undefined,
            workload
          };
        })
      );

      // Sort: qualified first, then by workload
      teachersWithDetails.sort((a, b) => {
        if (a.isQualified && !b.isQualified) return -1;
        if (!a.isQualified && b.isQualified) return 1;
        return (a.workload || 0) - (b.workload || 0);
      });

      setAvailableTeachers(teachersWithDetails);
    } catch (error) {
      console.error('Error fetching available teachers:', error);
    }
  };

  const fetchAvailableClasses = async () => {
    try {
      const response = await fetch(`/api/classes?schoolId=${session?.user?.schoolId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching available classes:', error);
    }
  };

  const handleOpenAddSubjectDialog = () => {
    setAddSubjectDialogOpen(true);
    fetchAvailableSubjects();
    fetchAvailableTeachers();
    setNewAssignment({ subjectId: '', teacherId: '', weeklyHours: 0, autoQualify: true });
    setAssignmentWarnings([]);
  };

  const handleOpenCloneDialog = () => {
    setCloneDialogOpen(true);
    fetchAvailableClasses();
  };

  const handleChangeTeacher = (assignmentId: string, subjectId: string, subjectName: string, currentTeacherId: string, currentTeacherName: string) => {
    setChangeTeacherDialog({
      open: true,
      assignmentId,
      subjectId,
      subjectName,
      currentTeacherId,
      currentTeacherName
    });
    setNewTeacherId(currentTeacherId || 'NONE'); // Use 'NONE' sentinel instead of empty string
    // Fetch teachers qualified for this subject
    fetchAvailableTeachers(subjectId);
  };

  const handleUpdateTeacher = async () => {
    // Allow change if there's a new selection (including 'NONE' for unassign)
    if (!newTeacherId || newTeacherId === changeTeacherDialog.currentTeacherId) return; // No change

    try {
      // Convert 'NONE' sentinel value to empty string for API
      const teacherIdToSend = newTeacherId === 'NONE' ? '' : newTeacherId;
      
      const response = await fetch(`/api/classes/${classId}/subjects?subjectId=${changeTeacherDialog.subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacherIdToSend,
          autoQualify: true
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show warnings if any
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach((warning: any) => {
            if (warning.type === 'info') {
              toast({ title: 'Info', description: warning.message });
            } else if (warning.type === 'warning') {
              toast({ title: 'Warning', description: warning.message, variant: 'default' });
            }
          });
        }
        toast({ title: 'Success', description: 'Teacher updated successfully' });
        setChangeTeacherDialog({ open: false, assignmentId: '', subjectId: '', subjectName: '', currentTeacherId: '', currentTeacherName: '' });
        setNewTeacherId('');
        fetchSubjects();
        fetchClassDetail();
      } else {
        // Check if there are validation warnings
        if (data.warnings) {
          setAssignmentWarnings(data.warnings);
          // Don't close dialog, show warnings
        } else {
          throw new Error(data.error || 'Failed to update teacher');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Fetch teachers when subject changes
  const handleSubjectChange = (subjectId: string) => {
    setNewAssignment(prev => ({ ...prev, subjectId, teacherId: '' }));
    if (subjectId) {
      fetchAvailableTeachers(subjectId);
    } else {
      fetchAvailableTeachers();
    }
  };

  const handleAddSubject = async () => {
    if (!newAssignment.subjectId) {
      toast({ title: 'Error', description: 'Please select a subject', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`/api/classes/${classId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment),
      });

      const data = await response.json();

      if (response.ok) {
        // Show warnings if any
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach((warning: any) => {
            if (warning.type === 'info') {
              toast({ title: 'Info', description: warning.message });
            } else if (warning.type === 'warning') {
              toast({ title: 'Warning', description: warning.message, variant: 'default' });
            }
          });
        }
        toast({ title: 'Success', description: 'Subject assigned successfully' });
        setAddSubjectDialogOpen(false);
        setAssignmentWarnings([]);
        fetchSubjects();
        fetchClassDetail();
      } else {
        // Check if there are validation warnings
        if (data.warnings) {
          setAssignmentWarnings(data.warnings);
          // Don't close dialog, show warnings
        } else {
          throw new Error(data.error || 'Failed to assign subject');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveSubject = async (assignmentId: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to remove "${subjectName}" from this class?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/classes/${classId}/subjects?subjectId=${assignmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Subject removed successfully' });
        fetchSubjects();
        fetchClassDetail();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove subject');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchClassDetail();
  }, [classId, session?.user?.schoolId]);

  useEffect(() => {
    if (currentTab === 'subjects') {
      fetchSubjects();
    } else if (currentTab === 'teachers') {
      fetchTeachers();
    }
  }, [currentTab, classId]);

  // Mark as hydrated and reset dialog state on mount to prevent hydration mismatches
  useEffect(() => {
    isHydrated.current = true;
    setChangeTeacherDialog({ open: false, assignmentId: '', subjectId: '', subjectName: '', currentTeacherId: '', currentTeacherName: '' });
  }, []);

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
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Class Name</label>
                  <p className="text-lg">{classDetail?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Academic Year</label>
                  <p className="text-lg">{classDetail?.academicYear}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Capacity</label>
                  <p className="text-lg">{classDetail?.capacity} students</p>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Class editing functionality coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="subjects" className="pt-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assigned Subjects</CardTitle>
                <CardDescription>Manage subjects taught in {classDetail.name} and their weekly quotas.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleOpenCloneDialog} 
                  variant="outline"
                  className="border-gray-300"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Clone from Class
                </Button>
                <Dialog open={addSubjectDialogOpen} onOpenChange={setAddSubjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleOpenAddSubjectDialog} className="bg-black hover:bg-gray-800">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subject
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Subject to {classDetail.name}</DialogTitle>
                    <DialogDescription>
                      Assign a subject to this class with a teacher and weekly hours.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {assignmentWarnings.length > 0 && (
                      <div className="space-y-2">
                        {assignmentWarnings.map((warning, idx) => (
                          <Alert key={idx} variant={warning.type === 'error' ? 'destructive' : 'default'}>
                            {warning.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                            <AlertDescription>
                              <strong>{warning.message}</strong>
                              {warning.details && <p className="text-sm mt-1">{warning.details}</p>}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Select
                        value={newAssignment.subjectId}
                        onValueChange={handleSubjectChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name} {subject.code && `(${subject.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="teacher">Teacher (Optional)</Label>
                      <Select
                        value={newAssignment.teacherId}
                        onValueChange={(value) => setNewAssignment(prev => ({ ...prev, teacherId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No teacher assigned</SelectItem>
                          {availableTeachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              <div className="flex items-center justify-between w-full gap-2">
                                <span>{teacher.name}</span>
                                <div className="flex items-center gap-2">
                                  {teacher.isQualified !== undefined && (
                                    <TeacherQualificationBadge 
                                      isQualified={teacher.isQualified} 
                                      variant="compact"
                                    />
                                  )}
                                  {teacher.workload !== undefined && (
                                    <Badge variant="outline" className="text-xs">
                                      {teacher.workload}h
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {newAssignment.subjectId && newAssignment.teacherId && (
                        <p className="text-xs text-gray-500">
                          {availableTeachers.find(t => t.id === newAssignment.teacherId)?.isQualified 
                            ? '✓ This teacher is qualified for this subject' 
                            : '⚠ This teacher will be automatically qualified for this subject'}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="weeklyHours">Weekly Hours</Label>
                      <Input
                        id="weeklyHours"
                        type="number"
                        min="0"
                        max="40"
                        value={newAssignment.weeklyHours}
                        onChange={(e) => setNewAssignment(prev => ({ ...prev, weeklyHours: parseInt(e.target.value) || 0 }))}
                        placeholder="Enter weekly hours"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddSubjectDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddSubject}>
                      Add Subject
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSubjects ? (
                <div className="text-center py-8 text-gray-500">Loading subjects...</div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No subjects assigned yet.</p>
                  <p className="text-sm mt-2">Subjects will appear here when teachers are assigned to this class.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Hours</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subjects.map((subject) => (
                          <tr key={subject.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <Link href={`/dashboard/admin/subjects/${subject.subjectId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                {subject.subjectName}
                              </Link>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {subject.subjectCode || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {subject.teacherName ? (
                                <Link href={`/dashboard/admin/teachers/${subject.teacherId}`} className="text-blue-600 hover:text-blue-800">
                                  {subject.teacherName}
                                </Link>
                              ) : (
                                <span className="text-gray-400 italic">No teacher assigned</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {editingWeeklyHours === subject.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="40"
                                    value={tempWeeklyHours}
                                    onChange={(e) => setTempWeeklyHours(parseInt(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSaveWeeklyHours(subject.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEditWeeklyHours}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono">
                                    {subject.weeklyHours || 0}h/week
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStartEditWeeklyHours(subject.id, subject.weeklyHours || 0)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => window.open(`/dashboard/admin/subjects/${subject.subjectId}`, '_blank')}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleChangeTeacher(subject.id, subject.subjectId, subject.subjectName, subject.teacherId || '', subject.teacherName || '')}
                                  >
                                    <User className="mr-2 h-4 w-4" />
                                    Change Teacher
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveSubject(subject.subjectId, subject.subjectName)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const totalHours = subjects.reduce((sum, s) => sum + (s.weeklyHours || 0), 0);
                    const maxWeeklyHours = 35; // 5 days × 7 teaching hours per day (typical)
                    const isOverAllocated = totalHours > maxWeeklyHours;
                    const utilizationPercentage = Math.round((totalHours / maxWeeklyHours) * 100);

                    return (
                      <div className={`mt-6 p-4 border rounded-lg ${
                        isOverAllocated 
                          ? 'bg-red-50 border-red-300' 
                          : totalHours > maxWeeklyHours * 0.9 
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Clock className={`h-5 w-5 ${
                            isOverAllocated ? 'text-red-600' : totalHours > maxWeeklyHours * 0.9 ? 'text-yellow-600' : 'text-blue-600'
                          }`} />
                          <span className={`font-semibold ${
                            isOverAllocated ? 'text-red-900' : totalHours > maxWeeklyHours * 0.9 ? 'text-yellow-900' : 'text-blue-900'
                          }`}>
                            Total Weekly Hours:
                          </span>
                          <Badge variant={isOverAllocated ? "destructive" : "default"} className="text-lg font-bold">
                            {totalHours}h / {maxWeeklyHours}h
                          </Badge>
                          <Badge variant="outline" className="ml-2">
                            {utilizationPercentage}% utilized
                          </Badge>
                        </div>
                        {isOverAllocated ? (
                          <p className="text-sm text-red-700 mt-2 font-medium">
                            ⚠️ Warning: Total assigned hours ({totalHours}h) exceeds typical available teaching time ({maxWeeklyHours}h). 
                            Consider reducing hours for some subjects.
                          </p>
                        ) : totalHours > maxWeeklyHours * 0.9 ? (
                          <p className="text-sm text-yellow-700 mt-2">
                            ⚠️ Notice: You're using {utilizationPercentage}% of available teaching time. Little room for additional subjects.
                          </p>
                        ) : (
                          <p className="text-sm text-blue-700 mt-2">
                            ✓ Good allocation. {maxWeeklyHours - totalHours}h remaining available for additional subjects or activities.
                            Click the edit icon to adjust weekly hours.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teachers" className="pt-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Assigned Teachers</CardTitle>
              <CardDescription>Teachers assigned to subjects for {classDetail.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTeachers ? (
                <div className="text-center py-8 text-gray-500">Loading teachers...</div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No teachers assigned yet.</p>
                  <p className="text-sm mt-2">Teachers will appear here when they are assigned to subjects in this class.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teachers.map((teacher) => (
                    <Card key={teacher.id} className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/dashboard/admin/teachers/${teacher.id}`} className="text-lg font-semibold text-blue-600 hover:text-blue-800">
                              {teacher.name}
                            </Link>
                            <p className="text-sm text-gray-500">{teacher.email}</p>
                          </div>
                          <Link href={`/dashboard/admin/teachers/${teacher.id}`}>
                            <Button size="sm" variant="outline">
                              View Profile
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <BookOpen className="h-4 w-4" />
                            Subjects Taught ({teacher.subjects.length}):
                          </div>
                          <div className="pl-6 space-y-2">
                            {teacher.subjects.map((subject) => (
                              <div key={subject.assignmentId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <Link href={`/dashboard/admin/subjects/${subject.id}`} className="text-blue-600 hover:text-blue-800">
                                  {subject.name}
                                </Link>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono">
                                    {subject.weeklyHours || 0}h/week
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">
                                Total Weekly Load in this class:
                              </span>
                              <Badge variant="default">
                                {teacher.subjects.reduce((sum, s) => sum + (s.weeklyHours || 0), 0)}h
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timetable" className="pt-6">
          <ClassTimetableTab
            classDetail={classDetail}
            classId={classId}
            subjects={subjects}
            teachers={teachers}
          />
        </TabsContent>
      </Tabs>

      {/* Clone Subjects Dialog */}
      <CloneSubjectsDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        targetClassId={classId}
        targetClassName={classDetail.name}
        availableClasses={availableClasses}
        onSuccess={() => {
          fetchSubjects();
          fetchClassDetail();
        }}
      />

      {/* Change Teacher Dialog */}
      <Dialog
        key={`change-teacher-${changeTeacherDialog.subjectId}`}
        open={changeTeacherDialog.open && changeTeacherDialog.subjectId !== ''}
        onOpenChange={(open) => {
        if (!open) {
          setChangeTeacherDialog({ open: false, assignmentId: '', subjectId: '', subjectName: '', currentTeacherId: '', currentTeacherName: '' });
          setNewTeacherId('NONE');
          setAssignmentWarnings([]);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Change Teacher for {changeTeacherDialog.subjectName || 'Subject'}
            </DialogTitle>
            <DialogDescription>
              Reassign the teacher for this subject in {classDetail?.name || 'this class'}
            </DialogDescription>
          </DialogHeader>

          {isHydrated.current ? (
            <div className="space-y-4 py-4">
              {assignmentWarnings.length > 0 && (
                <div className="space-y-2">
                  {assignmentWarnings.map((warning, idx) => (
                    <Alert key={idx} variant={warning.type === 'error' ? 'destructive' : 'default'}>
                      {warning.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                      <AlertDescription>
                        <strong>{warning.message}</strong>
                        {warning.details && <p className="text-sm mt-1">{warning.details}</p>}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Current Teacher</Label>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  {changeTeacherDialog.currentTeacherName ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span>{changeTeacherDialog.currentTeacherName}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">No teacher assigned</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>New Teacher</Label>
                <Select
                  value={newTeacherId}
                  onValueChange={setNewTeacherId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a new teacher" />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No teacher assigned</SelectItem>
                  {availableTeachers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Loading teachers...
                    </div>
                  ) : (
                    availableTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{teacher.name}</span>
                          <div className="flex items-center gap-2">
                            {teacher.isQualified !== undefined && (
                              <TeacherQualificationBadge
                                isQualified={teacher.isQualified}
                                variant="compact"
                              />
                            )}
                            {teacher.workload !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {teacher.workload}h
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
                </Select>
                {newTeacherId && newTeacherId !== 'NONE' && availableTeachers.find(t => t.id === newTeacherId)?.isQualified === false && (
                  <p className="text-xs text-yellow-600">
                    ⚠ This teacher will be automatically qualified for this subject
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="text-center text-gray-500">Loading...</div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setChangeTeacherDialog({ open: false, assignmentId: '', subjectId: '', subjectName: '', currentTeacherId: '', currentTeacherName: '' });
              setNewTeacherId('NONE');
              setAssignmentWarnings([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTeacher} disabled={newTeacherId === changeTeacherDialog.currentTeacherId || (newTeacherId === 'NONE' && !changeTeacherDialog.currentTeacherId)}>
              Update Teacher
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}