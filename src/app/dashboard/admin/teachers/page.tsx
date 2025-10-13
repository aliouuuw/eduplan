'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, BookOpen, Plus, Trash2, Clock, ArrowRight, User, GraduationCap } from 'lucide-react';
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
import Link from 'next/link'; // Added Link import
import { calculateWeeklyTeachingLoad } from '@/lib/teacher-utils'; // Assuming this utility exists or will be created
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';

interface Teacher {
  id: string;
  name: string;
  email: string;
  assignedSubjectsCount: number; // New field for stats
  assignedClassesCount: number;  // New field for stats
  totalWeeklyLoad: number; // New field for weekly load
}

interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code: string | null;
  description: string | null;
  weeklyHours: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Class {
  id: string;
  name: string;
  academicYear: string;
}

interface Assignment {
  id: string;
  teacherId?: string;
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
  const [teacherLoad, setTeacherLoad] = useState(0); // New state for weekly load

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch teachers with stats from new endpoint
      const teachersRes = await fetch('/api/dashboard/admin/teachers');
      
      if (teachersRes.ok) {
        const data = await teachersRes.json();
        const fetchedTeachers = Array.isArray(data.teachers) ? data.teachers : [];
        setTeachers(fetchedTeachers);
      }
      
      // Fetch subjects and classes for assignment dialogs
      const [subjectsRes, classesRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/classes'),
      ]);
      
      if (subjectsRes.ok) {
        const subData = await subjectsRes.json();
        setSubjects(Array.isArray(subData.subjects) ? subData.subjects : []);
      }
      
      if (classesRes.ok) {
        const classData = await classesRes.json();
        setClasses(Array.isArray(classData.classes) ? classData.classes : []);
      }
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
        const data = await assignmentsRes.json();
        const teacherSubjects = Array.isArray(data.subjects) ? data.subjects : [];
        const teacherClasses = Array.isArray(data.classes) ? data.classes : [];
        setTeacherAssignments({
          subjects: teacherSubjects,
          classes: teacherClasses,
        });

        // Calculate weekly teaching load based on assigned subjects' weeklyHours
        const currentLoad = calculateWeeklyTeachingLoad(teacherSubjects, subjects); 
        setTeacherLoad(currentLoad);
      }
      if (availabilityRes.ok) {
        const data = await availabilityRes.json();
        setTeacherAvailability(Array.isArray(data) ? data : []);
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

  const breadcrumbs = createBreadcrumbs.teachers();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <User className="h-8 w-8 text-gray-600" />
              Teachers
            </h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Manage teacher assignments, view their availability, and assign them to classes and subjects.
            </p>
          </div>
          <Button asChild className="bg-black hover:bg-gray-800">
            <Link href="/dashboard/admin/teachers/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Link>
          </Button>
        </div>
      </header>

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
      ) : teachers.length === 0 ? (
        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first teacher.</p>
            <Button asChild>
              <Link href="/dashboard/admin/teachers/new">
                <Plus className="h-4 w-4 mr-2" />
                Add First Teacher
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Card key={teacher.id} className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-black">
                  <Link
                    href={`/dashboard/admin/teachers/${teacher.id}`}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {teacher.name}
                  </Link>
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {teacher.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <BookOpen className="h-4 w-4" />
                      {teacher.assignedSubjectsCount} subjects
                    </span>
                    <span className="flex items-center gap-2 text-gray-600">
                      <GraduationCap className="h-4 w-4" />
                      {teacher.assignedClassesCount} classes
                    </span>
                  </div>
                  {teacher.totalWeeklyLoad > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Clock className="h-4 w-4" />
                      {teacher.totalWeeklyLoad} hours per week
                    </div>
                  )}
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/dashboard/admin/teachers/${teacher.id}`}>
                      View Profile
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs for teacher management - keeping for future use */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {assignmentType === 'subject' ? 'Assign Subject' : 'Assign Class'}
            </DialogTitle>
            <DialogDescription>
              {assignmentType === 'subject'
                ? 'Assign a subject to this teacher'
                : 'Assign this teacher to a class'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Teacher assignment functionality will be available in teacher detail pages.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
