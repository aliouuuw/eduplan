import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherClasses, classes, subjects, academicLevels, studentEnrollments, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * GET /api/dashboard/teacher/classes
 * Returns all classes assigned to the teacher with subject details and student counts
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

    // Get all classes assigned to this teacher with subject and level details
    const assignedClasses = await db
      .select({
        id: teacherClasses.id,
        classId: classes.id,
        className: classes.name,
        academicYear: classes.academicYear,
        capacity: classes.capacity,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        levelId: academicLevels.id,
        levelName: academicLevels.name,
      })
      .from(teacherClasses)
      .innerJoin(classes, eq(teacherClasses.classId, classes.id))
      .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
      .innerJoin(academicLevels, eq(classes.levelId, academicLevels.id))
      .where(
        and(
          eq(teacherClasses.teacherId, teacherId),
          eq(teacherClasses.schoolId, schoolId)
        )
      )
      .orderBy(classes.name);

    // Get student counts for each class
    const classIds = assignedClasses.map(c => c.classId);
    const studentCounts = classIds.length > 0
      ? await db
          .select({
            classId: studentEnrollments.classId,
            count: sql<number>`count(*)`,
          })
          .from(studentEnrollments)
          .where(
            and(
              sql`${studentEnrollments.classId} IN ${classIds}`,
              eq(studentEnrollments.isActive, true)
            )
          )
          .groupBy(studentEnrollments.classId)
      : [];

    const studentCountMap = new Map(
      studentCounts.map(sc => [sc.classId, Number(sc.count)])
    );

    // Combine data
    const classesWithCounts = assignedClasses.map(cls => ({
      ...cls,
      studentCount: studentCountMap.get(cls.classId) || 0,
    }));

    return NextResponse.json(classesWithCounts);
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/dashboard/teacher/classes/:classId/students
 * Returns students enrolled in a specific class (only if teacher teaches it)
 */
export async function getClassStudents(classId: string, teacherId: string, schoolId: string) {
  try {
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
      return { error: 'You are not assigned to this class', status: 403 };
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

    return { students, status: 200 };
  } catch (error) {
    console.error('Error fetching class students:', error);
    return { error: 'Internal server error', status: 500 };
  }
}

