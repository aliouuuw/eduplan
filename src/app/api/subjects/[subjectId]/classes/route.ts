
import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  subjects,
  teacherClasses,
  classes
} from '@/db/schema';
import { eq, and, InferSelectModel } from 'drizzle-orm';

type ClassWithAcademicYear = InferSelectModel<typeof classes>;

/**
 * GET /api/subjects/[subjectId]/classes
 * Get a list of classes that use a specific subject
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ subjectId: string }> }) {
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

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    // Verify the subject exists and belongs to the school
    const subjectExists = await db.select().from(subjects).where(
      and(
        eq(subjects.id, subjectId),
        schoolId ? eq(subjects.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (subjectExists.length === 0) {
      return NextResponse.json({ error: 'Subject not found or not authorized' }, { status: 404 });
    }

    // Fetch classes that have this subject assigned via teacherClasses
    const classesUsingSubject = await db.select({
      id: classes.id,
      name: classes.name,
      academicYear: classes.academicYear,
    })
    .from(teacherClasses)
    .innerJoin(classes, eq(teacherClasses.classId, classes.id))
    .where(
      and(
        eq(teacherClasses.subjectId, subjectId),
        schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined
      )
    )
    .groupBy(classes.id, classes.name, classes.academicYear) // Ensure distinct classes
    .orderBy(classes.name);

    return NextResponse.json({ classes: classesUsingSubject }, { status: 200 });

  } catch (error) {
    console.error('Error fetching classes for subject usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
