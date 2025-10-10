'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, GraduationCap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AssignedClass {
  id: string;
  classId: string;
  className: string;
  academicYear: string;
  capacity: number;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  levelId: string;
  levelName: string;
  studentCount: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  enrollmentDate: Date;
  academicYear: string;
}

export default function TeacherClasses() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<AssignedClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch('/api/dashboard/teacher/classes');
        if (response.ok) {
          const data = await response.json();
          setClasses(data);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleViewStudents = async (classData: AssignedClass) => {
    setSelectedClass(classData);
    setDialogOpen(true);
    setLoadingStudents(true);

    try {
      const response = await fetch(`/api/dashboard/teacher/classes/${classData.classId}/students`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Group classes by academic level
  const classesByLevel = classes.reduce((acc, cls) => {
    if (!acc[cls.levelName]) {
      acc[cls.levelName] = [];
    }
    acc[cls.levelName].push(cls);
    return acc;
  }, {} as Record<string, AssignedClass[]>);

  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">My Classes</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          View all classes you're teaching this semester, along with subject assignments and student lists.
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Classes</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {loading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  classes.length
                )}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
              <BookOpen className="h-6 w-6 text-gray-600" />
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Students</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {loading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  totalStudents
                )}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
              <Users className="h-6 w-6 text-gray-600" />
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Academic Levels</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {loading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  Object.keys(classesByLevel).length
                )}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
              <GraduationCap className="h-6 w-6 text-gray-600" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Classes by Academic Level */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, idx) => (
            <Card key={idx} className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-black">No Classes Assigned</h3>
            <p className="text-sm text-gray-600">
              You don't have any classes assigned yet. Contact your school administrator for class assignments.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(classesByLevel).map(([levelName, levelClasses]) => (
          <Card key={levelName} className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-black">
                <GraduationCap className="h-5 w-5 text-gray-600" />
                {levelName}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {levelClasses.length} {levelClasses.length === 1 ? 'class' : 'classes'} in this level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {levelClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:border-black hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-black text-white text-sm font-semibold">
                        {cls.subjectCode || cls.subjectName.substring(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-black">
                          {cls.className} - {cls.subjectName}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {cls.studentCount} students
                          </span>
                          <span>•</span>
                          <span>{cls.academicYear}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewStudents(cls)}
                      className="border-gray-300 transition group-hover:border-black group-hover:bg-black group-hover:text-white"
                    >
                      View Students
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Student List Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">
              {selectedClass?.className} - {selectedClass?.subjectName}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Student list for {selectedClass?.academicYear}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {loadingStudents ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Users className="mb-3 h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-600">No students enrolled in this class yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-gray-600">{student.email}</TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(student.enrollmentDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

