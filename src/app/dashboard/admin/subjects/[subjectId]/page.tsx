'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, Settings, ArrowRight, Plus, Trash2, GraduationCap, UserPlus, UserMinus, Edit, Check, X } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TeacherQualificationBadge } from '@/components/teacher-qualification-badge';

interface SubjectDetail {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  weeklyHours: number | null;
}

interface QualifiedTeacher {
  id: string;
  name: string;
  email: string;
  qualificationId: string;
  workload?: number;
  assignmentCount?: number;
}

interface ClassAssignment {
  classId: string;
  className: string;
  academicYear: string;
  teacherId: string | null;
  teacherName: string | null;
  weeklyHours: number;
  assignmentId: string;
}

export default function AdminSubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [subjectDetail, setSubjectDetail] = useState<SubjectDetail | null>(null);
  const [qualifiedTeachers, setQualifiedTeachers] = useState<QualifiedTeacher[]>([]);
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [addTeacherDialogOpen, setAddTeacherDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'add' | 'remove'>('add');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [tempTeacherId, setTempTeacherId] = useState('');

  const fetchSubjectDetail = async () => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/subjects/${subjectId}`);
      if (response.ok) {
        const data = await response.json();
        setSubjectDetail(data.subject);
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

  const fetchQualifiedTeachers = async () => {
    if (!subjectId) return;
    try {
      const response = await fetch(`/api/subjects/${subjectId}/qualified-teachers`);
      if (response.ok) {
        const data = await response.json();
        
        // Fetch workload for each teacher
        const teachersWithWorkload = await Promise.all(
          data.qualifiedTeachers.map(async (teacher: any) => {
            try {
              const workloadResponse = await fetch(`/api/teachers/${teacher.id}/workload`);
              if (workloadResponse.ok) {
                const workloadData = await workloadResponse.json();
                return {
                  ...teacher,
                  workload: workloadData.totalWeeklyHours,
                  assignmentCount: workloadData.assignmentCount,
                };
              }
            } catch (e) {
              // Ignore errors
            }
            return teacher;
          })
        );
        
        setQualifiedTeachers(teachersWithWorkload);
      }
    } catch (error) {
      console.error('Error fetching qualified teachers:', error);
    }
  };

  const fetchClassAssignments = async () => {
    if (!subjectId) return;
    try {
      const response = await fetch(`/api/subjects/${subjectId}/classes`);
      if (response.ok) {
        const data = await response.json();
        setClassAssignments(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching class assignments:', error);
    }
  };

  const fetchAvailableTeachers = async () => {
    try {
      const response = await fetch(`/api/users?schoolId=${session?.user?.schoolId}&role=teacher`);
      if (response.ok) {
        const data = await response.json();
        // Filter out already qualified teachers
        const qualifiedIds = new Set(qualifiedTeachers.map(t => t.id));
        setAvailableTeachers(data.users.filter((t: any) => !qualifiedIds.has(t.id)));
      }
    } catch (error) {
      console.error('Error fetching available teachers:', error);
    }
  };

  const handleAddTeacherQualification = async () => {
    if (!selectedTeacherId) {
      toast({ title: 'Error', description: 'Please select a teacher', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch('/api/teacher-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subject',
          teacherId: selectedTeacherId,
          subjectId,
          schoolId: session?.user?.schoolId,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Teacher qualification added' });
        setAddTeacherDialogOpen(false);
        setSelectedTeacherId('');
        fetchQualifiedTeachers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add qualification');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveQualification = async (qualificationId: string, teacherName: string) => {
    if (!confirm(`Remove ${teacherName}'s qualification to teach this subject?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teacher-assignments/${qualificationId}?type=subject`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Qualification removed' });
        fetchQualifiedTeachers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove qualification');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleBulkTeacherAction = async () => {
    if (selectedTeacherIds.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one teacher', variant: 'destructive' });
      return;
    }

    setBulkLoading(true);
    try {
      const response = await fetch(`/api/subjects/${subjectId}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherIds: selectedTeacherIds,
          action: bulkAction,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Bulk ${bulkAction} completed for ${selectedTeacherIds.length} teacher(s)`
        });
        setBulkDialogOpen(false);
        setSelectedTeacherIds([]);
        fetchQualifiedTeachers();
        fetchAvailableTeachers();
      } else {
        throw new Error(data.error || 'Bulk operation failed');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };

  const openBulkDialog = (action: 'add' | 'remove') => {
    setBulkAction(action);
    setSelectedTeacherIds([]);
    setBulkDialogOpen(true);
    if (action === 'add') {
      fetchAvailableTeachers();
    }
  };

  const startTeacherEdit = (assignmentId: string, currentTeacherId: string) => {
    setEditingTeacher(assignmentId);
    setTempTeacherId(currentTeacherId || '');
  };

  const cancelTeacherEdit = () => {
    setEditingTeacher(null);
    setTempTeacherId('');
  };

  const saveTeacherChange = async (assignment: ClassAssignment) => {
    try {
      const response = await fetch(`/api/classes/${assignment.classId}/subjects?subjectId=${subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: tempTeacherId || '', // Empty string = unassign
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
        toast({ title: 'Success', description: 'Teacher assignment updated' });
        setEditingTeacher(null);
        setTempTeacherId('');
        fetchClassAssignments();
      } else {
        throw new Error(data.error || 'Failed to update teacher assignment');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchSubjectDetail();
    fetchQualifiedTeachers();
    fetchClassAssignments();
  }, [subjectId]);

  if (loading) {
    return (
      <div className="space-y-10">
        <header className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
        </header>
      </div>
    );
  }

  if (!subjectDetail) {
    return (
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold text-black">Subject Not Found</h1>
        <Link href="/dashboard/admin/subjects">
          <Button>Back to Subjects</Button>
        </Link>
      </div>
    );
  }

  const breadcrumbs = [
    ...createBreadcrumbs.subjects(),
    { label: subjectDetail.name, icon: <BookOpen className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-gray-600" />
              {subjectDetail.name}
              {subjectDetail.code && (
                <Badge variant="outline" className="text-lg">
                  {subjectDetail.code}
                </Badge>
              )}
            </h1>
            {subjectDetail.description && (
              <p className="max-w-2xl text-sm text-gray-600">
                {subjectDetail.description}
              </p>
            )}
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/subjects">
              View All Subjects <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Qualified Teachers</p>
                  <p className="text-3xl font-semibold text-black">{qualifiedTeachers.length}</p>
                </div>
                <Users className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Classes Using</p>
                  <p className="text-3xl font-semibold text-black">{classAssignments.length}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Weekly Hours</p>
                  <p className="text-3xl font-semibold text-black">{subjectDetail.weeklyHours || 0}h</p>
                </div>
                <BookOpen className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teachers">Qualified Teachers</TabsTrigger>
          <TabsTrigger value="classes">Class Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Subject Details</CardTitle>
              <CardDescription>Basic information about {subjectDetail.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Subject Name</label>
                  <p className="text-lg text-black">{subjectDetail.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Subject Code</label>
                  <p className="text-lg text-black">{subjectDetail.code || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Weekly Hours</label>
                  <p className="text-lg text-black">{subjectDetail.weeklyHours || 0} hours</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-lg text-black">{subjectDetail.description || 'No description'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-6">
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Qualified Teachers</CardTitle>
                <CardDescription>Teachers certified to teach {subjectDetail.name}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => openBulkDialog('add')}
                  variant="outline"
                  className="border-gray-300"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Bulk Add
                </Button>
                <Button
                  onClick={() => openBulkDialog('remove')}
                  variant="outline"
                  className="border-gray-300"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Bulk Remove
                </Button>
                <Dialog open={addTeacherDialogOpen} onOpenChange={setAddTeacherDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={fetchAvailableTeachers} className="bg-black hover:bg-gray-800">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Teacher
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Teacher Qualification</DialogTitle>
                    <DialogDescription>
                      Qualify a teacher to teach {subjectDetail.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Teacher</Label>
                      <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name} ({teacher.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddTeacherDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTeacherQualification}>
                      Add Qualification
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {qualifiedTeachers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No qualified teachers yet</p>
                  <p className="text-sm mt-2">Add teachers who can teach this subject</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {qualifiedTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/admin/teachers/${teacher.id}`}
                            className="font-medium text-black hover:text-gray-600"
                          >
                            {teacher.name}
                          </Link>
                          <p className="text-sm text-gray-500">{teacher.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {teacher.workload !== undefined && (
                          <Badge variant="outline">{teacher.workload}h workload</Badge>
                        )}
                        {teacher.assignmentCount !== undefined && (
                          <Badge variant="secondary">{teacher.assignmentCount} assignments</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveQualification(teacher.qualificationId, teacher.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Class Assignments</CardTitle>
              <CardDescription>Classes where {subjectDetail.name} is taught</CardDescription>
            </CardHeader>
            <CardContent>
              {classAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Not assigned to any classes yet</p>
                  <p className="text-sm mt-2">This subject will appear here when assigned to classes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classAssignments.map((assignment) => (
                    <div
                      key={assignment.assignmentId}
                      className="group flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <Link
                          href={`/dashboard/admin/classes/${assignment.classId}`}
                          className="font-medium text-black hover:text-gray-600"
                        >
                          {assignment.className}
                        </Link>
                        <p className="text-sm text-gray-500">{assignment.academicYear}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{assignment.weeklyHours}h/week</Badge>
                        {editingTeacher === assignment.assignmentId ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={tempTeacherId}
                              onValueChange={setTempTeacherId}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No teacher</SelectItem>
                                {qualifiedTeachers.map(teacher => (
                                  <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => saveTeacherChange(assignment)} className="h-8 w-8 p-0">
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelTeacherEdit} className="h-8 w-8 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {assignment.teacherName ? (
                              <Link
                                href={`/dashboard/admin/teachers/${assignment.teacherId}`}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {assignment.teacherName}
                              </Link>
                            ) : (
                              <span className="text-sm text-gray-400 italic">No teacher</span>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => startTeacherEdit(assignment.assignmentId, assignment.teacherId || '')} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Teacher Operations Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkAction === 'add' ? (
                <>
                  <UserPlus className="h-5 w-5" />
                  Bulk Add Teacher Qualifications
                </>
              ) : (
                <>
                  <UserMinus className="h-5 w-5" />
                  Bulk Remove Teacher Qualifications
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'add'
                ? `Select teachers to qualify for teaching ${subjectDetail?.name}`
                : `Select qualified teachers to remove qualification for ${subjectDetail?.name}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(bulkAction === 'add' ? availableTeachers : qualifiedTeachers).map((teacher) => (
                <div key={teacher.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <Checkbox
                    id={`teacher-${teacher.id}`}
                    checked={selectedTeacherIds.includes(teacher.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTeacherIds(prev => [...prev, teacher.id]);
                      } else {
                        setSelectedTeacherIds(prev => prev.filter(id => id !== teacher.id));
                      }
                    }}
                  />
                  <label
                    htmlFor={`teacher-${teacher.id}`}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <span className="font-medium text-black">{teacher.name}</span>
                      <p className="text-sm text-gray-500">{teacher.email}</p>
                    </div>
                    {teacher.workload !== undefined && bulkAction === 'add' && (
                      <Badge variant="outline" className="text-xs">
                        {teacher.workload}h workload
                      </Badge>
                    )}
                  </label>
                </div>
              ))}
              {(bulkAction === 'add' ? availableTeachers : qualifiedTeachers).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  {bulkAction === 'add'
                    ? 'No unqualified teachers available'
                    : 'No qualified teachers to remove'
                  }
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkLoading}>
              Cancel
            </Button>
            <Button onClick={handleBulkTeacherAction} disabled={selectedTeacherIds.length === 0 || bulkLoading}>
              {bulkLoading ? (
                `${bulkAction === 'add' ? 'Adding' : 'Removing'}...`
              ) : (
                `${bulkAction === 'add' ? 'Add' : 'Remove'} ${selectedTeacherIds.length} Teacher${selectedTeacherIds.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
