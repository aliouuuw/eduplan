import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { timetables } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema
const activateSchema = z.object({
  classId: z.string().min(1),
  academicYear: z.string().min(1),
});

/**
 * POST /api/timetables/activate
 * Activate a draft timetable for a class
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = activateSchema.parse(body);

    const schoolId = session.user.schoolId;
    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    console.log(`✅ Activating timetable for class ${validated.classId}, year ${validated.academicYear}`);

    // Step 1: Check if there are any draft entries to activate
    const draftCount = await db.$count(
      timetables,
      and(
        eq(timetables.classId, validated.classId),
        eq(timetables.schoolId, schoolId || ''),
        eq(timetables.academicYear, validated.academicYear),
        eq(timetables.status, 'draft')
      )
    );

    if (draftCount === 0) {
      return NextResponse.json(
        { error: 'No draft timetable found to activate' },
        { status: 404 }
      );
    }

    // Step 2: Delete existing active entries for this class and year
    console.log(`🗑️ Deleting existing active timetable entries`);
    await db
      .delete(timetables)
      .where(
        and(
          eq(timetables.classId, validated.classId),
          eq(timetables.schoolId, schoolId || ''),
          eq(timetables.academicYear, validated.academicYear),
          eq(timetables.status, 'active')
        )
      );

    // Step 3: Activate all draft entries
    console.log(`🚀 Activating ${draftCount} draft entries`);
    const activated = await db
      .update(timetables)
      .set({
        status: 'active',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(timetables.classId, validated.classId),
          eq(timetables.schoolId, schoolId || ''),
          eq(timetables.academicYear, validated.academicYear),
          eq(timetables.status, 'draft')
        )
      )
      .returning();

    console.log(`✅ Successfully activated ${activated.length} timetable entries`);

    return NextResponse.json({
      success: true,
      message: `Timetable activated successfully`,
      summary: {
        classId: validated.classId,
        academicYear: validated.academicYear,
        entriesActivated: activated.length,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error activating timetable:', error);
    return NextResponse.json({
      error: 'Activation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
