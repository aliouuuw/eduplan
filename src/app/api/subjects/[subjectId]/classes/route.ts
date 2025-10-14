import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherClasses, classes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/subjects/[subjectId]/classes
 * Get all classes using a specific subject
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

    const classAssignments = await db
      .select({
        classId: classes.id,
        className: classes.name,
        academicYear: classes.academicYear,
        teacherId: users.id,
        teacherName: users.name,
        weeklyHours: teacherClasses.weeklyHours,
        assignmentId: teacherClasses.id,
      })
      .from(teacherClasses)
      .innerJoin(classes, eq(teacherClasses.classId, classes.id))
      .leftJoin(users, eq(teacherClasses.teacherId, users.id))
      .where(
        and(
          eq(teacherClasses.subjectId, subjectId),
          schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined
        )
      );

    return NextResponse.json({ classes: classAssignments }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching subject classes:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
