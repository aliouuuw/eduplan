import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  users,
  teacherSubjects,
  teacherClasses,
  subjects,
  classes,
  teacherAvailability
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/users/[userId]
 * Get comprehensive teacher details including subjects, classes, and availability
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId } = await params;
    const schoolId = session.user.schoolId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get teacher basic info
    const userWhereConditions = [
      eq(users.id, userId),
      eq(users.role, 'teacher')
    ];
    if (schoolId) {
      userWhereConditions.push(eq(users.schoolId, schoolId));
    }

    const teacherData = await db.select().from(users).where(
      and(...userWhereConditions)
    ).limit(1);

    if (teacherData.length === 0) {
      return NextResponse.json({ error: 'Teacher not found or not authorized' }, { status: 404 });
    }

    const teacher = teacherData[0];

    // Get subjects the teacher teaches
    const subjectWhereConditions = [eq(teacherSubjects.teacherId, userId)];
    if (schoolId) {
      subjectWhereConditions.push(eq(teacherSubjects.schoolId, schoolId));
    }

    const subjectsData = await db.select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      weeklyHours: subjects.weeklyHours,
    })
    .from(teacherSubjects)
    .innerJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
    .where(and(...subjectWhereConditions));

    // Get classes the teacher teaches with subjects
    const classWhereConditions = [eq(teacherClasses.teacherId, userId)];
    if (schoolId) {
      classWhereConditions.push(eq(teacherClasses.schoolId, schoolId));
    }

    const classesData = await db.select({
      classId: classes.id,
      className: classes.name,
      academicYear: classes.academicYear,
      subjectId: subjects.id,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      weeklyHours: teacherClasses.weeklyHours,
    })
    .from(teacherClasses)
    .innerJoin(classes, eq(teacherClasses.classId, classes.id))
    .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
    .where(and(...classWhereConditions))
    .orderBy(classes.name, subjects.name);

    // Get teacher's availability
    const availabilityWhereConditions = [eq(teacherAvailability.teacherId, userId)];
    if (schoolId) {
      availabilityWhereConditions.push(eq(teacherAvailability.schoolId, schoolId));
    }

    const availabilityData = await db.select().from(teacherAvailability).where(
      and(...availabilityWhereConditions)
    ).orderBy(teacherAvailability.dayOfWeek, teacherAvailability.startTime);

    // Group classes by subject for better organization
    const classesBySubject = classesData.reduce((acc: any, item) => {
      if (!acc[item.subjectId]) {
        acc[item.subjectId] = {
          id: item.subjectId,
          name: item.subjectName,
          code: item.subjectCode,
          classes: []
        };
      }
      acc[item.subjectId].classes.push({
        id: item.classId,
        weeklyHours: item.weeklyHours,
        name: item.className,
        academicYear: item.academicYear,
      });
      return acc;
    }, {});

    // Group availability by day
    const availabilityByDay = availabilityData.reduce((acc: any, item) => {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item.dayOfWeek];
      if (!acc[dayName]) {
        acc[dayName] = [];
      }
      acc[dayName].push({
        id: item.id,
        startTime: item.startTime,
        endTime: item.endTime,
        isRecurring: item.isRecurring,
        notes: item.notes,
      });
      return acc;
    }, {});

    // Calculate statistics
    const totalSubjects = subjectsData.length;
    const totalClasses = classesData.length;
    const uniqueClasses = new Set(classesData.map(c => c.classId)).size;

    return NextResponse.json({
      teacher,
      subjects: subjectsData,
      classesBySubject: Object.values(classesBySubject),
      availability: availabilityByDay,
      statistics: {
        totalSubjects,
        totalClasses,
        uniqueClasses,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching teacher details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
