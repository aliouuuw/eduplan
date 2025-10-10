import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { timetables, timeSlots, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Utility functions
function getCurrentTimestamp(): Date {
  return new Date();
}

// Validation schema
const timetableUpdateSchema = z.object({
  subjectId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  timeSlotId: z.string().min(1).optional(),
  status: z.enum(['draft', 'active']).optional(),
});

/**
 * GET /api/timetables/[id]
 * Get a specific timetable entry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    const entry = await db
      .select()
      .from(timetables)
      .where(
        and(
          eq(timetables.id, params.id),
          eq(timetables.schoolId, schoolId)
        )
      )
      .limit(1);

    if (entry.length === 0) {
      return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry[0]);
  } catch (error) {
    console.error('Error fetching timetable entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/timetables/[id]
 * Update a timetable entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // Only admins can update timetable entries
    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const body = await request.json();
    const validated = timetableUpdateSchema.parse(body);

    // Check if timetable entry exists
    const existingEntry = await db
      .select()
      .from(timetables)
      .where(
        and(
          eq(timetables.id, params.id),
          eq(timetables.schoolId, schoolId)
        )
      )
      .limit(1);

    if (existingEntry.length === 0) {
      return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
    }

    const currentEntry = existingEntry[0];

    // If time slot is being changed, verify it exists and is not a break
    if (validated.timeSlotId && validated.timeSlotId !== currentEntry.timeSlotId) {
      const timeSlotExists = await db
        .select()
        .from(timeSlots)
        .where(
          and(
            eq(timeSlots.id, validated.timeSlotId),
            eq(timeSlots.schoolId, schoolId)
          )
        )
        .limit(1);

      if (timeSlotExists.length === 0) {
        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
      }

      if (timeSlotExists[0].isBreak) {
        return NextResponse.json(
          { error: 'Cannot schedule teaching periods during break times' },
          { status: 400 }
        );
      }

      // Check if the new time slot is already occupied by this class
      const timeSlotConflict = await db
        .select()
        .from(timetables)
        .where(
          and(
            eq(timetables.classId, currentEntry.classId),
            eq(timetables.timeSlotId, validated.timeSlotId),
            eq(timetables.schoolId, schoolId)
          )
        )
        .limit(1);

      if (timeSlotConflict.length > 0) {
        return NextResponse.json(
          { error: 'Time slot already scheduled for this class' },
          { status: 400 }
        );
      }
    }

    // If teacher is being changed, check for conflicts
    if (validated.teacherId) {
      const teacherExists = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, validated.teacherId),
            eq(users.schoolId, schoolId),
            eq(users.role, 'teacher')
          )
        )
        .limit(1);

      if (teacherExists.length === 0) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
      }

      // Check if teacher is already scheduled at this time slot (excluding current entry)
      const timeSlotId = validated.timeSlotId || currentEntry.timeSlotId;
      const teacherConflict = await db
        .select()
        .from(timetables)
        .where(
          and(
            eq(timetables.teacherId, validated.teacherId),
            eq(timetables.timeSlotId, timeSlotId),
            eq(timetables.schoolId, schoolId)
          )
        )
        .limit(1);

      if (teacherConflict.length > 0 && teacherConflict[0].id !== params.id) {
        return NextResponse.json(
          { error: 'Teacher is already scheduled at this time slot' },
          { status: 400 }
        );
      }
    }

    // Update the timetable entry
    const updatedEntry = await db
      .update(timetables)
      .set({
        ...validated,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(timetables.id, params.id),
          eq(timetables.schoolId, schoolId)
        )
      )
      .returning();

    return NextResponse.json(updatedEntry[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating timetable entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/timetables/[id]
 * Delete a timetable entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // Only admins can delete timetable entries
    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    // Check if timetable entry exists
    const existingEntry = await db
      .select()
      .from(timetables)
      .where(
        and(
          eq(timetables.id, params.id),
          eq(timetables.schoolId, schoolId)
        )
      )
      .limit(1);

    if (existingEntry.length === 0) {
      return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
    }

    // Delete the timetable entry
    await db
      .delete(timetables)
      .where(
        and(
          eq(timetables.id, params.id),
          eq(timetables.schoolId, schoolId)
        )
      );

    return NextResponse.json({ message: 'Timetable entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
