import { DefaultSession } from 'next-auth';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      schoolId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    schoolId: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    schoolId: string | null;
  }
}

// Application types
export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'parent' | 'student';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
}

export interface DashboardStats {
  totalSchools?: number;
  totalUsers?: number;
  totalClasses?: number;
  totalSubjects?: number;
  totalTeachers?: number;
  totalStudents?: number;
  totalParents?: number;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  className: string;
  subjectId: string | null;
  subjectName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  timeSlotId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: 'draft' | 'active';
}

export interface ConflictCheck {
  hasConflict: boolean;
  conflictType?: 'teacher_double_booked' | 'class_overlap';
  conflictDetails?: string;
}
