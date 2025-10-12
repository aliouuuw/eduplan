import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherAvailability } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Get current timestamp
function getCurrentTimestamp(): Date {
  return new Date();
}

// Validation schemas
const bulkAvailabilitySchema = z.object({
  teacherIds: z.array(z.string().min(1)).min(1),
  availability: z.array(z.object({
    id: z.string().optional(), // For updates
    dayOfWeek: z.number().min(1).max(7),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    notes: z.string().optional(),
  })).min(1),
});

/**
 * POST /api/teacher-availability/bulk
 * Bulk create/update availability for multiple teachers
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
    const validated = bulkAvailabilitySchema.parse(body);

    const schoolId = session.user.schoolId;
    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // Validate teachers exist and belong to school
    for (const teacherId of validated.teacherIds) {
      const teacher = await db
        .select()
        .from('users')
        .where(
          schoolId
            ? and(eq('users.id', teacherId), eq('users.schoolId', schoolId), eq('users.role', 'teacher'))
            : eq('users.id', teacherId)
        )
        .limit(1);

      if (teacher.length === 0) {
        return NextResponse.json(
          { error: `Teacher ${teacherId} not found or not authorized` },
          { status: 404 }
        );
      }
    }

    const results = [];
    const errors = [];

    // Process each teacher
    for (const teacherId of validated.teacherIds) {
      try {
        // Delete existing availability for this teacher
        await db
          .delete(teacherAvailability)
          .where(
            and(
              eq(teacherAvailability.teacherId, teacherId),
              eq(teacherAvailability.schoolId, schoolId || '')
            )
          );

        // Create new availability slots
        const newSlots = validated.availability.map(slot => ({
          id: generateId(),
          teacherId,
          schoolId: schoolId || '',
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isRecurring: true,
          notes: slot.notes,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        }));

        // Insert new slots
        await db.insert(teacherAvailability).values(newSlots);

        results.push({
          teacherId,
          status: 'success',
          slotsCreated: newSlots.length,
        });

      } catch (error) {
        console.error(`Error updating availability for teacher ${teacherId}:`, error);
        errors.push({
          teacherId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    return NextResponse.json({
      success: errorCount === 0,
      message: `Updated ${successCount} teacher(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results,
      errors: errorCount > 0 ? errors : undefined,
      summary: {
        total: validated.teacherIds.length,
        successful: successCount,
        failed: errorCount,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error in bulk availability update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
