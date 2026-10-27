import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { getTeacherMetrics } from '@/lib/teacher-utils';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { activeTeacher } from '@/lib/teacher-scope';
import { schoolScopeFor } from '@/lib/school-scope';

/**
 * GET /api/teachers/stats?schoolId=xxx
 * Get bulk teacher statistics for all teachers in a school
 * Optimized to avoid N+1 queries on listing pages
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    // A school admin can only read their own school; only a superadmin may pass ?schoolId.
    const schoolId = schoolScopeFor(session.user, searchParams.get('schoolId'));

    if (!schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all teachers for the school
    const teachers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), activeTeacher()))
      .orderBy(users.name);

    // Fetch metrics for all teachers
    const teacherStats = await Promise.all(
      teachers.map(async (teacher) => {
        try {
          return await getTeacherMetrics(teacher.id, schoolId);
        } catch (error) {
          console.error(`Error fetching metrics for teacher ${teacher.id}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed fetches
    const validStats = teacherStats.filter((stat) => stat !== null);

    return NextResponse.json({ teachers: validStats }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching bulk teacher stats:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

