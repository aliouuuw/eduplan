import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { timeSlots } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { z } from 'zod';
import { generateId } from '@/lib/utils';

function getCurrentTimestamp(): Date {
  return new Date();
}

// Validation schema
const timeSlotSchema = z.object({
  dayOfWeek: z.number().min(1).max(7),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  name: z.string().min(1).max(100),
  isBreak: z.boolean().default(false),
});

/**
 * GET /api/time-slots
 * Get all time slots for the school
 */
export async function GET(request: NextRequest) {
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

    const slots = await db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.schoolId, schoolId))
      .orderBy(asc(timeSlots.dayOfWeek), asc(timeSlots.startTime));

    // Group by day for easier frontend rendering
    const slotsByDay = slots.reduce((acc, slot) => {
      const day = slot.dayOfWeek;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(slot);
      return acc;
    }, {} as Record<number, typeof slots>);

    return NextResponse.json({
      slots,
      slotsByDay,
      totalSlots: slots.length,
      teachingSlots: slots.filter(s => !s.isBreak).length,
      breakSlots: slots.filter(s => s.isBreak).length,
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/time-slots
 * Create a new time slot
 */
export async function POST(request: NextRequest) {
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
    const validated = timeSlotSchema.parse(body);

    // Validate time logic
    if (validated.startTime >= validated.endTime) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    // Check for overlapping time slots on the same day
    const existingSlots = await db
      .select()
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.schoolId, schoolId),
          eq(timeSlots.dayOfWeek, validated.dayOfWeek)
        )
      );

    // Check for time overlap
    for (const existing of existingSlots) {
      const newStart = validated.startTime;
      const newEnd = validated.endTime;
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

    const id = generateId();
    const now = getCurrentTimestamp();

    const newSlot = await db
      .insert(timeSlots)
      .values({
        id,
        schoolId,
        dayOfWeek: validated.dayOfWeek,
        startTime: validated.startTime,
        endTime: validated.endTime,
        name: validated.name,
        isBreak: validated.isBreak,
        createdAt: now,
      })
      .returning();

    return NextResponse.json(newSlot[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error creating time slot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
