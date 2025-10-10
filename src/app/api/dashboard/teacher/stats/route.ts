import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherSubjects, teacherClasses, studentEnrollments, timetables } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * GET /api/dashboard/teacher/stats
 * Returns statistics for a teacher dashboard
 * - Total assigned subjects
 * - Total assigned classes
 * - Total students across all classes
 * - Total scheduled periods
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    const teacherId = session.user.id;
    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // Get total assigned subjects
    const subjectsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(teacherSubjects)
      .where(
        and(
          eq(teacherSubjects.teacherId, teacherId),
          eq(teacherSubjects.schoolId, schoolId)
        )
      );

    // Get total assigned classes
    const classesResult = await db
      .select({ count: sql<number>`count(distinct ${teacherClasses.classId})` })
      .from(teacherClasses)
      .where(
        and(
          eq(teacherClasses.teacherId, teacherId),
          eq(teacherClasses.schoolId, schoolId)
        )
      );

    // Get total students in assigned classes
    const studentsResult = await db
      .select({ count: sql<number>`count(distinct ${studentEnrollments.studentId})` })
      .from(teacherClasses)
      .innerJoin(
        studentEnrollments,
        and(
          eq(teacherClasses.classId, studentEnrollments.classId),
          eq(studentEnrollments.isActive, true)
        )
      )
      .where(
        and(
          eq(teacherClasses.teacherId, teacherId),
          eq(teacherClasses.schoolId, schoolId)
        )
      );

    // Get total scheduled periods (timetable entries)
    const periodsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(timetables)
      .where(
        and(
          eq(timetables.teacherId, teacherId),
          eq(timetables.schoolId, schoolId),
          eq(timetables.status, 'active')
        )
      );

    return NextResponse.json({
      totalSubjects: Number(subjectsResult[0]?.count || 0),
      totalClasses: Number(classesResult[0]?.count || 0),
      totalStudents: Number(studentsResult[0]?.count || 0),
      totalPeriods: Number(periodsResult[0]?.count || 0),
    });
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

