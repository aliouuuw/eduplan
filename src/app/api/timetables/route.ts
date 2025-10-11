import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { timetables, classes, subjects, users, timeSlots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getCurrentTimestamp(): Date {
  return new Date();
}

// Validation schema
const timetableSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  timeSlotId: z.string().min(1),
  academicYear: z.string().min(1),
  status: z.enum(['draft', 'active']).default('draft'),
});

/**
 * GET /api/timetables
 * Get timetable entries for a class or all classes
 * Query params: classId (optional)
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

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');

    // Build query conditions
    const conditions = [eq(timetables.schoolId, schoolId)];
    if (classId) {
      conditions.push(eq(timetables.classId, classId));
    }

    // Build query
    const query = db
      .select({
        id: timetables.id,
        classId: timetables.classId,
        className: classes.name,
        subjectId: timetables.subjectId,
        subjectName: subjects.name,
        teacherId: timetables.teacherId,
        teacherName: users.name,
        timeSlotId: timetables.timeSlotId,
        dayOfWeek: timeSlots.dayOfWeek,
        startTime: timeSlots.startTime,
        endTime: timeSlots.endTime,
        slotName: timeSlots.name,
        isBreak: timeSlots.isBreak,
        academicYear: timetables.academicYear,
        status: timetables.status,
        createdAt: timetables.createdAt,
        updatedAt: timetables.updatedAt,
      })
      .from(timetables)
      .innerJoin(classes, eq(timetables.classId, classes.id))
      .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
      .leftJoin(users, eq(timetables.teacherId, users.id))
      .innerJoin(timeSlots, eq(timetables.timeSlotId, timeSlots.id))
      .where(and(...conditions));

    const entries = await query;

    return NextResponse.json({
      timetable: entries,
      total: entries.length,
    });
  } catch (error) {
    console.error('Error fetching timetables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/timetables
 * Create a new timetable entry
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

    // Only admins can create timetable entries
    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const body = await request.json();
    const validated = timetableSchema.parse(body);

    // Verify class belongs to the school
    const classExists = await db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.id, validated.classId),
          eq(classes.schoolId, schoolId)
        )
      )
      .limit(1);

    if (classExists.length === 0) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Verify time slot belongs to the school
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

    // Check if time slot is a break
    if (timeSlotExists[0].isBreak) {
      return NextResponse.json(
        { error: 'Cannot schedule teaching periods during break times' },
        { status: 400 }
      );
    }

    // Check for existing timetable entry for this class and time slot
    const existingEntry = await db
      .select()
      .from(timetables)
      .where(
        and(
          eq(timetables.classId, validated.classId),
          eq(timetables.timeSlotId, validated.timeSlotId),
          eq(timetables.schoolId, schoolId)
        )
      )
      .limit(1);

    if (existingEntry.length > 0) {
      return NextResponse.json(
        { error: 'Time slot already scheduled for this class' },
        { status: 400 }
      );
    }

    // If teacher is assigned, check for conflicts
    if (validated.teacherId) {
      // Check if teacher is already scheduled at this time slot
      const teacherConflict = await db
        .select()
        .from(timetables)
        .where(
          and(
            eq(timetables.teacherId, validated.teacherId),
            eq(timetables.timeSlotId, validated.timeSlotId),
            eq(timetables.schoolId, schoolId)
          )
        )
        .limit(1);

      if (teacherConflict.length > 0) {
        return NextResponse.json(
          { error: 'Teacher is already scheduled at this time slot' },
          { status: 400 }
        );
      }

      // Verify teacher belongs to the school
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
    }

    const id = generateId();
    const now = getCurrentTimestamp();

    const newEntry = await db
      .insert(timetables)
      .values({
        id,
        schoolId,
        classId: validated.classId,
        subjectId: validated.subjectId,
        teacherId: validated.teacherId,
        timeSlotId: validated.timeSlotId,
        academicYear: validated.academicYear,
        status: validated.status,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newEntry[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error creating timetable entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
