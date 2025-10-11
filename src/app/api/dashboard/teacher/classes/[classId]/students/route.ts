import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherClasses, studentEnrollments, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/dashboard/teacher/classes/:classId/students
 * Returns students enrolled in a specific class (only if teacher teaches it)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
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
    const { classId } = await params;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // Verify teacher teaches this class
    const teacherClass = await db
      .select()
      .from(teacherClasses)
      .where(
        and(
          eq(teacherClasses.teacherId, teacherId),
          eq(teacherClasses.classId, classId),
          eq(teacherClasses.schoolId, schoolId)
        )
      )
      .limit(1);

    if (teacherClass.length === 0) {
      return NextResponse.json(
        { error: 'You are not assigned to this class' },
        { status: 403 }
      );
    }

    // Get students in this class
    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        enrollmentDate: studentEnrollments.enrollmentDate,
        academicYear: studentEnrollments.academicYear,
      })
      .from(studentEnrollments)
      .innerJoin(users, eq(studentEnrollments.studentId, users.id))
      .where(
        and(
          eq(studentEnrollments.classId, classId),
          eq(studentEnrollments.isActive, true),
          eq(studentEnrollments.schoolId, schoolId)
        )
      )
      .orderBy(users.name);

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching class students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

