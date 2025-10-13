import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { timetables } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema
const discardSchema = z.object({
  classId: z.string().min(1),
});

/**
 * DELETE /api/timetables/discard
 * Discard draft timetable entries for a class
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = discardSchema.parse(body);

    const schoolId = session.user.schoolId;
    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    console.log(`🗑️ Discarding draft timetable for class ${validated.classId}`);

    // Step 1: Count draft entries before deletion
    const draftCount = await db.$count(
      timetables,
      and(
        eq(timetables.classId, validated.classId),
        eq(timetables.schoolId, schoolId || ''),
        eq(timetables.status, 'draft')
      )
    );

    if (draftCount === 0) {
      return NextResponse.json(
        { error: 'No draft timetable found to discard' },
        { status: 404 }
      );
    }

    // Step 2: Delete all draft entries for this class
    console.log(`🧹 Deleting ${draftCount} draft entries`);
    await db
      .delete(timetables)
      .where(
        and(
          eq(timetables.classId, validated.classId),
          eq(timetables.schoolId, schoolId || ''),
          eq(timetables.status, 'draft')
        )
      );

    console.log(`✅ Successfully discarded ${draftCount} draft timetable entries`);

    return NextResponse.json({
      success: true,
      message: `Draft timetable discarded successfully`,
      summary: {
        classId: validated.classId,
        entriesDiscarded: draftCount,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error discarding timetable:', error);
    return NextResponse.json({
      error: 'Discard failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
