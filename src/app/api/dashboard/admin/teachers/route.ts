import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, teacherSubjects, teacherClasses } from '@/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';

/**
 * GET /api/dashboard/admin/teachers
 * Get all teachers with their assignment statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const schoolId = session.user.schoolId;

    // Get all teachers for this school
    const whereConditions = [eq(users.role, 'teacher')];
    if (schoolId) {
      whereConditions.push(eq(users.schoolId, schoolId));
    }

    const allTeachers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        schoolId: users.schoolId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...whereConditions))
      .orderBy(users.name);

    // For each teacher, get their assignment counts
    const teachersWithStats = await Promise.all(
      allTeachers.map(async (teacher) => {
        // Count unique subjects
        const subjectCount = await db
          .select({ count: count(teacherSubjects.subjectId) })
          .from(teacherSubjects)
          .where(eq(teacherSubjects.teacherId, teacher.id));

        // Count total class assignments
        const classAssignmentCount = await db
          .select({ count: count(teacherClasses.id) })
          .from(teacherClasses)
          .where(eq(teacherClasses.teacherId, teacher.id));

        // Count unique classes
        const uniqueClassCount = await db
          .select({ 
            count: sql<number>`count(distinct ${teacherClasses.classId})` 
          })
          .from(teacherClasses)
          .where(eq(teacherClasses.teacherId, teacher.id));

        // Calculate total weekly teaching load from class-subject assignments
        const weeklyLoadResult = await db
          .select({
            totalHours: sql<number>`coalesce(sum(${teacherClasses.weeklyHours}), 0)`
          })
          .from(teacherClasses)
          .where(eq(teacherClasses.teacherId, teacher.id));

        return {
          ...teacher,
          assignedSubjectsCount: subjectCount[0]?.count || 0,
          assignedClassesCount: uniqueClassCount[0]?.count || 0,
          totalWeeklyLoad: weeklyLoadResult[0]?.totalHours || 0,
        };
      })
    );

    return NextResponse.json({ teachers: teachersWithStats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teachers with stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

