import { NextRequest, NextResponse } from 'next/server';
import { auth, isTeacher, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherAvailability } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Get current timestamp
function getCurrentTimestamp(): Date {
  return new Date();
}

// Validation schema
const updateAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(1).max(7).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  isRecurring: z.boolean().optional(),
  notes: z.string().optional(),
});

/**
 * PUT /api/teacher-availability/[id]
 * Update existing availability slot
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

    const { id } = await params;
    const body = await request.json();
    const validated = updateAvailabilitySchema.parse(body);

    // Get existing availability
    const existing = await db
      .select()
      .from(teacherAvailability)
      .where(eq(teacherAvailability.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 });
    }

    const availability = existing[0];

    // Teachers can only update their own availability
    if (isTeacher(session.user.role) && availability.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only update your own availability' },
        { status: 403 }
      );
    }

    // Admins can only update availability in their school
    if (isSchoolAdmin(session.user.role) && availability.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Cannot update availability in other schools' },
        { status: 403 }
      );
    }

    // If changing time or day, check for overlaps
    if (validated.dayOfWeek || validated.startTime || validated.endTime) {
      const dayToCheck = validated.dayOfWeek || availability.dayOfWeek;
      const startToCheck = validated.startTime || availability.startTime;
      const endToCheck = validated.endTime || availability.endTime;

      const overlapping = await db
        .select()
        .from(teacherAvailability)
        .where(
          and(
            eq(teacherAvailability.teacherId, availability.teacherId),
            eq(teacherAvailability.schoolId, availability.schoolId),
            eq(teacherAvailability.dayOfWeek, dayToCheck)
          )
        );

      // Check for time overlap (excluding current record)
      for (const existing of overlapping) {
        if (existing.id === id) continue;

        if (
          (startToCheck >= existing.startTime && startToCheck < existing.endTime) ||
          (endToCheck > existing.startTime && endToCheck <= existing.endTime) ||
          (startToCheck <= existing.startTime && endToCheck >= existing.endTime)
        ) {
          return NextResponse.json(
            { error: 'Updated availability overlaps with existing slot' },
            { status: 400 }
          );
        }
      }
    }

    const now = getCurrentTimestamp();

    const updated = await db
      .update(teacherAvailability)
      .set({
        ...validated,
        updatedAt: now,
      })
      .where(eq(teacherAvailability.id, id))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('Error updating teacher availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/teacher-availability/[id]
 * Hard delete availability slot
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

    const { id } = await params;

    // Get existing availability
    const existing = await db
      .select()
      .from(teacherAvailability)
      .where(eq(teacherAvailability.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 });
    }

    const availability = existing[0];

    // Teachers can only delete their own availability
    if (isTeacher(session.user.role) && availability.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own availability' },
        { status: 403 }
      );
    }

    // Admins can only delete availability in their school
    if (isSchoolAdmin(session.user.role) && availability.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Cannot delete availability in other schools' },
        { status: 403 }
      );
    }

    // Hard delete the availability slot
    await db
      .delete(teacherAvailability)
      .where(eq(teacherAvailability.id, id));

    return NextResponse.json({ message: 'Availability deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

