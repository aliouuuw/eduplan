'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, BookOpen, Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface Class {
  id: string;
  name: string;
  academicYear: string;
}

interface Assignment {
  id: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string | null;
  classId?: string;
  className?: string;
  academicYear?: string;
}

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  notes: string | null;
}

const DAYS_OF_WEEK = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminTeachersPage() {
  const { data: session } = useSession();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<{
    subjects: Assignment[];
    classes: Assignment[];
  }>({ subjects: [], classes: [] });
  const [teacherAvailability, setTeacherAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'subject' | 'class'>('subject');
  const [assignmentData, setAssignmentData] = useState({
    subjectId: '',
    classId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teachersRes, subjectsRes, classesRes] = await Promise.all([
        fetch(`/api/users?schoolId=${session?.user?.schoolId}&role=teacher`),
        fetch('/api/subjects'),
        fetch('/api/classes'),
      ]);

      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherDetails = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    try {
      const [assignmentsRes, availabilityRes] = await Promise.all([
        fetch(`/api/teacher-assignments?teacherId=${teacher.id}`),
        fetch(`/api/teacher-availability?teacherId=${teacher.id}`),
      ]);

      if (assignmentsRes.ok) {
        setTeacherAssignments(await assignmentsRes.json());
      }
      if (availabilityRes.ok) {
        setTeacherAvailability(await availabilityRes.json());
      }
    } catch (error) {
      console.error('Error fetching teacher details:', error);
    }
  };

  const handleOpenAssignDialog = (type: 'subject' | 'class') => {
    setAssignmentType(type);
    setAssignmentData({ subjectId: '', classId: '' });
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedTeacher) return;

    try {
      const payload = {
        type: assignmentType,
        teacherId: selectedTeacher.id,
        schoolId: session?.user?.schoolId,
        ...(assignmentType === 'subject'
          ? { subjectId: assignmentData.subjectId }
          : {
              classId: assignmentData.classId,
              subjectId: assignmentData.subjectId,
            }),
      };

      const response = await fetch('/api/teacher-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to assign');
        return;
      }

      toast.success(`${assignmentType === 'subject' ? 'Subject' : 'Class'} assigned successfully`);
      setAssignDialogOpen(false);
      fetchTeacherDetails(selectedTeacher);
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error('An error occurred');
    }
  };

  const handleRemoveAssignment = async (id: string, type: 'subject' | 'class') => {
    if (!confirm(`Are you sure you want to remove this ${type} assignment?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teacher-assignments/${id}?type=${type}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove assignment');
        return;
      }

      toast.success('Assignment removed successfully');
      if (selectedTeacher) {
        fetchTeacherDetails(selectedTeacher);
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('An error occurred');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-black">Teacher Management</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Manage teacher assignments, view their availability, and assign them to classes and subjects.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Teachers List */}
        <Card className="lg:col-span-1 rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-black">
              <Users className="h-5 w-5 text-gray-600" />
              Teachers
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Select a teacher to manage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : teachers.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">No teachers found</p>
            ) : (
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => fetchTeacherDetails(teacher)}
                    className={`w-full text-left rounded-lg border p-3 transition hover:border-black hover:shadow-sm ${
                      selectedTeacher?.id === teacher.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium text-black">{teacher.name}</p>
                    <p className="text-xs text-gray-500">{teacher.email}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teacher Details */}
        <Card className="lg:col-span-2 rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">
              {selectedTeacher ? selectedTeacher.name : 'Select a Teacher'}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              {selectedTeacher ? selectedTeacher.email : 'Select a teacher to view their details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTeacher ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-600">Select a teacher from the list to view their assignments and availability</p>
              </div>
            ) : (
              <Tabs defaultValue="subjects" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="subjects">Subjects</TabsTrigger>
                  <TabsTrigger value="classes">Classes</TabsTrigger>
                  <TabsTrigger value="availability">Availability</TabsTrigger>
                </TabsList>

                {/* Subjects Tab */}
                <TabsContent value="subjects" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Subjects this teacher can teach
                    </p>
                    <Button size="sm" onClick={() => handleOpenAssignDialog('subject')}>
                      <Plus className="h-4 w-4 mr-1" />
                      Assign Subject
                    </Button>
                  </div>

                  {teacherAssignments.subjects.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-8">
                      No subjects assigned yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teacherAssignments.subjects.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white text-sm font-semibold">
                              {assignment.subjectCode || assignment.subjectName?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-black">{assignment.subjectName}</p>
                              {assignment.subjectCode && (
                                <p className="text-xs text-gray-500">{assignment.subjectCode}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAssignment(assignment.id, 'subject')}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Classes Tab */}
                <TabsContent value="classes" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Classes assigned to this teacher
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleOpenAssignDialog('class')}
                      disabled={teacherAssignments.subjects.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assign Class
                    </Button>
                  </div>

                  {teacherAssignments.subjects.length === 0 ? (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <p className="text-sm text-yellow-800">
                        Assign subjects to this teacher first before assigning classes.
                      </p>
                    </div>
                  ) : teacherAssignments.classes.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-8">
                      No classes assigned yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teacherAssignments.classes.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                        >
                          <div>
                            <p className="font-medium text-black">
                              {assignment.className} - {assignment.subjectName}
                            </p>
                            <p className="text-xs text-gray-500">{assignment.academicYear}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAssignment(assignment.id, 'class')}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Availability Tab */}
                <TabsContent value="availability" className="space-y-4">
                  <p className="text-sm text-gray-600">
                    When this teacher is available to teach
                  </p>

                  {teacherAvailability.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-8">
                      Teacher hasn't set their availability yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teacherAvailability.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-black">
                              {DAYS_OF_WEEK[slot.dayOfWeek]}
                            </p>
                            <p className="text-sm text-gray-600">
                              {slot.startTime} - {slot.endTime}
                            </p>
                            {slot.notes && (
                              <p className="text-xs text-gray-500 mt-1">{slot.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign {assignmentType === 'subject' ? 'Subject' : 'Class'}
            </DialogTitle>
            <DialogDescription>
              {assignmentType === 'subject'
                ? 'Select a subject this teacher can teach'
                : 'Assign this teacher to a class for a specific subject'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={assignmentData.subjectId}
                onValueChange={(value) =>
                  setAssignmentData({ ...assignmentData, subjectId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {(assignmentType === 'subject'
                    ? subjects
                    : teacherAssignments.subjects.map((a) => ({
                        id: a.subjectId!,
                        name: a.subjectName!,
                        code: a.subjectCode,
                      }))
                  ).map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} {subject.code && `(${subject.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignmentType === 'class' && (
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={assignmentData.classId}
                  onValueChange={(value) =>
                    setAssignmentData({ ...assignmentData, classId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.academicYear})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={
                  !assignmentData.subjectId ||
                  (assignmentType === 'class' && !assignmentData.classId)
                }
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

