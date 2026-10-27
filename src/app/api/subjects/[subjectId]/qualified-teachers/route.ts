import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherClasses } from '@/db/schema';
import { getQualifiedTeachers } from '@/lib/assignment-validation';

/**
 * GET /api/subjects/[subjectId]/qualified-teachers
 * Get all teachers qualified to teach a specific subject
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { subjectId } = await params;
    const schoolId = session.user.schoolId;

    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    const qualifiedTeachers = await getQualifiedTeachers(subjectId, schoolId || '');
    const teacherIds = qualifiedTeachers.map((teacher) => teacher.id);

    const workloadByTeacher = new Map<string, { hours: number; count: number }>();
    if (schoolId && teacherIds.length > 0) {
      const assignmentRows = await db
        .select({
          teacherId: teacherClasses.teacherId,
          weeklyHours: teacherClasses.weeklyHours,
        })
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.schoolId, schoolId),
            inArray(teacherClasses.teacherId, teacherIds)
          )
        );

      for (const row of assignmentRows) {
        const current = workloadByTeacher.get(row.teacherId) ?? { hours: 0, count: 0 };
        current.hours += row.weeklyHours || 0;
        current.count += 1;
        workloadByTeacher.set(row.teacherId, current);
      }
    }

    return NextResponse.json({
      qualifiedTeachers: qualifiedTeachers.map((teacher) => {
        const workload = workloadByTeacher.get(teacher.id);
        return {
          ...teacher,
          workload: workload?.hours ?? 0,
          assignmentCount: workload?.count ?? 0,
        };
      }),
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching qualified teachers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

