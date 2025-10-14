import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherSubjects, subjects, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { generateId } from '@/lib/utils';

// Schema for bulk teacher qualification management
const bulkTeacherQualificationSchema = z.object({
  teacherIds: z.array(z.string()).min(1, 'At least one teacher must be specified'),
  action: z.enum(['add', 'remove']).default('add'),
});

/**
 * POST /api/subjects/[subjectId]/teachers - Bulk manage teacher qualifications
 */
export async function POST(
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
    const body = await request.json();
    const validated = bulkTeacherQualificationSchema.parse(body);

    // Verify subject exists and belongs to school
    const subject = await db
      .select()
      .from(subjects)
      .where(
        and(
          eq(subjects.id, subjectId),
          schoolId ? eq(subjects.schoolId, schoolId) : undefined
        )
      )
      .limit(1);

    if (subject.length === 0) {
      return NextResponse.json({ error: 'Subject not found or not authorized' }, { status: 404 });
    }

    // Verify all teachers exist and belong to school
    const teachers = await db
      .select()
      .from(users)
      .where(
        and(
          inArray(users.id, validated.teacherIds),
          schoolId ? eq(users.schoolId, schoolId) : undefined,
          eq(users.role, 'teacher')
        )
      );

    if (teachers.length !== validated.teacherIds.length) {
      return NextResponse.json(
        { error: 'One or more teachers not found or not authorized' },
        { status: 404 }
      );
    }

    const results = [];
    const now = new Date();

    if (validated.action === 'add') {
      // Add qualifications
      for (const teacherId of validated.teacherIds) {
        // Check if qualification already exists
        const existing = await db
          .select()
          .from(teacherSubjects)
          .where(
            and(
              eq(teacherSubjects.teacherId, teacherId),
              eq(teacherSubjects.subjectId, subjectId),
              eq(teacherSubjects.schoolId, schoolId || '')
            )
          )
          .limit(1);

        if (existing.length === 0) {
          // Create new qualification
          const id = generateId();
          await db.insert(teacherSubjects).values({
            id,
            teacherId,
            subjectId,
            schoolId: schoolId || '',
            createdAt: now,
          });
          results.push({
            teacherId,
            teacherName: teachers.find(t => t.id === teacherId)?.name,
            action: 'added',
          });
        } else {
          results.push({
            teacherId,
            teacherName: teachers.find(t => t.id === teacherId)?.name,
            action: 'already_qualified',
          });
        }
      }
    } else {
      // Remove qualifications
      for (const teacherId of validated.teacherIds) {
        const deleted = await db
          .delete(teacherSubjects)
          .where(
            and(
              eq(teacherSubjects.teacherId, teacherId),
              eq(teacherSubjects.subjectId, subjectId),
              eq(teacherSubjects.schoolId, schoolId || '')
            )
          )
          .returning();

        results.push({
          teacherId,
          teacherName: teachers.find(t => t.id === teacherId)?.name,
          action: deleted.length > 0 ? 'removed' : 'not_found',
        });
      }
    }

    return NextResponse.json({
      message: `Bulk ${validated.action} completed`,
      results,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Error bulk managing teacher qualifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

