import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { timeSlots, timetables } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Utility functions
function getCurrentTimestamp(): Date {
  return new Date();
}

// Validation schema
const timeSlotUpdateSchema = z.object({
  dayOfWeek: z.number().min(1).max(7).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  name: z.string().min(1).max(100).optional(),
  isBreak: z.boolean().optional(),
});

/**
 * GET /api/time-slots/[id]
 * Get a specific time slot
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

    // Only admins and superadmins can view time slots
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const slot = await db
      .select()
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.id, params.id),
          eq(timeSlots.schoolId, schoolId)
        )
      )
      .limit(1);

    if (slot.length === 0) {
      return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
    }

    return NextResponse.json(slot[0]);
  } catch (error) {
    console.error('Error fetching time slot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/time-slots/[id]
 * Update a time slot
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

    // Only admins and superadmins can manage time slots
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const body = await request.json();
    const validated = timeSlotUpdateSchema.parse(body);

    // Check if time slot exists
    const existingSlot = await db
      .select()
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.id, params.id),
          eq(timeSlots.schoolId, schoolId)
        )
      )
      .limit(1);

    if (existingSlot.length === 0) {
      return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
    }

    const currentSlot = existingSlot[0];

    // Validate time logic if times are being updated
    if (validated.startTime && validated.endTime) {
      if (validated.startTime >= validated.endTime) {
        return NextResponse.json(
          { error: 'Start time must be before end time' },
          { status: 400 }
        );
      }
    }

    // Check for overlapping time slots on the same day (excluding current slot)
    const dayOfWeek = validated.dayOfWeek ?? currentSlot.dayOfWeek;
    const existingSlots = await db
      .select()
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.schoolId, schoolId),
          eq(timeSlots.dayOfWeek, dayOfWeek)
        )
      );

    // Check for time overlap with other slots
    const startTime = validated.startTime ?? currentSlot.startTime;
    const endTime = validated.endTime ?? currentSlot.endTime;

    for (const existing of existingSlots) {
      // Skip the current slot being updated
      if (existing.id === params.id) continue;

      const newStart = startTime;
      const newEnd = endTime;
      const existingStart = existing.startTime;
      const existingEnd = existing.endTime;
      
      // True overlap occurs when:
      // - New start is strictly between existing start and end (not equal)
      // - OR new end is strictly between existing start and end (not equal)
      // - OR new slot completely encompasses existing slot
      const hasOverlap =
        (newStart > existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd < existingEnd) ||
        (newStart < existingStart && newEnd > existingEnd);
      
      if (hasOverlap) {
        return NextResponse.json(
          { error: `Time slot overlaps with existing slot: ${existing.name} (${existingStart}-${existingEnd})` },
          { status: 400 }
        );
      }
    }

    // Update the time slot
    const updatedSlot = await db
      .update(timeSlots)
      .set({
        ...validated,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(timeSlots.id, params.id),
          eq(timeSlots.schoolId, schoolId)
        )
      )
      .returning();

    return NextResponse.json(updatedSlot[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating time slot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/time-slots/[id]
 * Delete a time slot
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

    // Only admins and superadmins can manage time slots
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    // Check if time slot exists
    const existingSlot = await db
      .select()
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.id, params.id),
          eq(timeSlots.schoolId, schoolId)
        )
      )
      .limit(1);

    if (existingSlot.length === 0) {
      return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
    }

    // Check if time slot is being used in any timetables
    const timetableUsage = await db
      .select()
      .from(timetables)
      .where(
        and(
          eq(timetables.timeSlotId, params.id),
          eq(timetables.schoolId, schoolId)
        )
      )
      .limit(1);

    if (timetableUsage.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete time slot that is being used in timetables' },
        { status: 400 }
      );
    }

    // Delete the time slot
    await db
      .delete(timeSlots)
      .where(
        and(
          eq(timeSlots.id, params.id),
          eq(timeSlots.schoolId, schoolId)
        )
      );

    return NextResponse.json({ message: 'Time slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
