import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherClasses, teacherSubjects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating class assignment
const updateClassAssignmentSchema = z.object({
  weeklyHours: z.number().int().min(0).max(40),
});

/**
 * PUT /api/teacher-assignments/[id]
 * Update an assignment (currently only supports updating weeklyHours for class assignments)
 * Query params: type ('class')
 * Body: { weeklyHours: number }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (type !== 'class') {
      return NextResponse.json(
        { error: 'Only class assignments can be updated. Query parameter "type" must be "class"' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = updateClassAssignmentSchema.parse(body);

    const schoolId = session.user.schoolId;

    // Get existing assignment
    const existing = await db
      .select()
      .from(teacherClasses)
      .where(eq(teacherClasses.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify school access
    if (isSchoolAdmin(session.user.role) && existing[0].schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Cannot update assignments from other schools' },
        { status: 403 }
      );
    }

    // Update the assignment
    const updated = await db
      .update(teacherClasses)
      .set({ weeklyHours: validated.weeklyHours })
      .where(eq(teacherClasses.id, id))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('Error updating teacher assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/teacher-assignments/[id]
 * Delete an assignment (subject or class)
 * Query params: type ('subject' | 'class')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type || (type !== 'subject' && type !== 'class')) {
      return NextResponse.json(
        { error: 'Query parameter "type" must be either "subject" or "class"' },
        { status: 400 }
      );
    }

    const schoolId = session.user.schoolId;

    if (type === 'subject') {
      // Get existing assignment
      const existing = await db
        .select()
        .from(teacherSubjects)
        .where(eq(teacherSubjects.id, id))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      // Verify school access
      if (isSchoolAdmin(session.user.role) && existing[0].schoolId !== schoolId) {
        return NextResponse.json(
          { error: 'Cannot delete assignments from other schools' },
          { status: 403 }
        );
      }

      // Check if teacher has class assignments for this subject
      const classAssignments = await db
        .select()
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, existing[0].teacherId),
            eq(teacherClasses.subjectId, existing[0].subjectId)
          )
        );

      if (classAssignments.length > 0) {
        return NextResponse.json(
          { error: 'Cannot remove subject assignment while teacher has class assignments for this subject' },
          { status: 400 }
        );
      }

      await db.delete(teacherSubjects).where(eq(teacherSubjects.id, id));

      return NextResponse.json({ message: 'Subject assignment deleted successfully' });
    } else {
      // type === 'class'
      // Get existing assignment
      const existing = await db
        .select()
        .from(teacherClasses)
        .where(eq(teacherClasses.id, id))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      // Verify school access
      if (isSchoolAdmin(session.user.role) && existing[0].schoolId !== schoolId) {
        return NextResponse.json(
          { error: 'Cannot delete assignments from other schools' },
          { status: 403 }
        );
      }

      await db.delete(teacherClasses).where(eq(teacherClasses.id, id));

      return NextResponse.json({ message: 'Class assignment deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting teacher assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

