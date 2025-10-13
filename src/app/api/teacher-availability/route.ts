import { NextRequest, NextResponse } from 'next/server'
import { auth, isTeacher, isSchoolAdmin, isSuperAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { teacherAvailability, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '@/lib/utils'

// Get current timestamp
function getCurrentTimestamp(): Date {
  return new Date()
}

// Validation schema
const availabilitySchema = z.object({
  teacherId: z.string().min(1),
  schoolId: z.string().min(1),
  dayOfWeek: z.number().min(1).max(7),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  isRecurring: z.boolean().default(true),
  notes: z.string().optional(),
});

/**
 * GET /api/teacher-availability
 * Get availability for a specific teacher or all teachers (admin only)
 * Query params: teacherId (optional for admins)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 })
    }

    // Teachers can only view their own availability
    if (isTeacher(session.user.role)) {
      const availability = await db
        .select()
        .from(teacherAvailability)
        .where(
          and(
            eq(teacherAvailability.teacherId, session.user.id),
            eq(teacherAvailability.schoolId, schoolId)
          )
        )
        .orderBy(teacherAvailability.dayOfWeek, teacherAvailability.startTime);

      return NextResponse.json(availability)
    }

    // Admins can view any teacher's availability
    if (isSchoolAdmin(session.user.role) || isSuperAdmin(session.user.role)) {
      if (teacherId) {
        // Get specific teacher's availability
        const availability = await db
          .select({
            id: teacherAvailability.id,
            teacherId: teacherAvailability.teacherId,
            teacherName: users.name,
            teacherEmail: users.email,
            dayOfWeek: teacherAvailability.dayOfWeek,
            startTime: teacherAvailability.startTime,
            endTime: teacherAvailability.endTime,
            isRecurring: teacherAvailability.isRecurring,
            notes: teacherAvailability.notes,
            createdAt: teacherAvailability.createdAt,
            updatedAt: teacherAvailability.updatedAt,
          })
          .from(teacherAvailability)
          .innerJoin(users, eq(teacherAvailability.teacherId, users.id))
          .where(
            and(
              eq(teacherAvailability.teacherId, teacherId),
              eq(teacherAvailability.schoolId, schoolId)
            )
          )
          .orderBy(teacherAvailability.dayOfWeek, teacherAvailability.startTime);

        return NextResponse.json(availability)
      } else {
        // Get all teachers' availability in school
        const availability = await db
          .select({
            id: teacherAvailability.id,
            teacherId: teacherAvailability.teacherId,
            teacherName: users.name,
            teacherEmail: users.email,
            dayOfWeek: teacherAvailability.dayOfWeek,
            startTime: teacherAvailability.startTime,
            endTime: teacherAvailability.endTime,
            isRecurring: teacherAvailability.isRecurring,
            notes: teacherAvailability.notes,
            createdAt: teacherAvailability.createdAt,
            updatedAt: teacherAvailability.updatedAt,
          })
          .from(teacherAvailability)
          .innerJoin(users, eq(teacherAvailability.teacherId, users.id))
          .where(eq(teacherAvailability.schoolId, schoolId))
          .orderBy(users.name, teacherAvailability.dayOfWeek, teacherAvailability.startTime);

        return NextResponse.json(availability)
      }
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error) {
    console.error('Error fetching teacher availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/teacher-availability
 * Create new availability slot
 */
export async function POST(request: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  console.log(`🔵 [API ${requestId}] POST /api/teacher-availability - REQUEST RECEIVED`)
  
  try {
    const session = await auth();

    if (!session?.user) {
      console.log(`🔴 [API ${requestId}] Unauthorized`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log(`📝 [API ${requestId}] Request body:`, JSON.stringify(body, null, 2))
    const validated = availabilitySchema.parse(body)

    // Teachers can only create their own availability
    if (isTeacher(session.user.role) && validated.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only manage your own availability' },
        { status: 403 }
      )
    }

    // Admins can create availability for any teacher in their school
    if (isSchoolAdmin(session.user.role)) {
      if (validated.schoolId !== session.user.schoolId) {
        return NextResponse.json(
          { error: 'Cannot create availability for teachers in other schools' },
        { status: 403 }
      )
      }
    }

    // Verify teacher exists and belongs to the school
    const teacher = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, validated.teacherId),
          eq(users.schoolId, validated.schoolId),
          eq(users.role, 'teacher')
        )
      )
      .limit(1)

    if (teacher.length === 0) {
      return NextResponse.json(
        { error: 'Teacher not found or does not belong to this school' },
        { status: 404 }
      )
    }

    // Check for overlapping availability
    const existingAvailability = await db
      .select()
      .from(teacherAvailability)
      .where(
        and(
          eq(teacherAvailability.teacherId, validated.teacherId),
          eq(teacherAvailability.schoolId, validated.schoolId),
          eq(teacherAvailability.dayOfWeek, validated.dayOfWeek)
        )
      )

    // Check for time overlap (allow adjacent slots that touch but don't overlap)
    for (const existing of existingAvailability) {
      const newStart = validated.startTime
      const newEnd = validated.endTime
      const existingStart = existing.startTime
      const existingEnd = existing.endTime
      
      // True overlap occurs when:
      // - New start is strictly between existing start and end (not equal)
      // - OR new end is strictly between existing start and end (not equal)
      // - OR new slot completely encompasses existing slot
      const hasOverlap =
        (newStart > existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd < existingEnd) ||
        (newStart < existingStart && newEnd > existingEnd)
      
      if (hasOverlap) {
        return NextResponse.json(
          { error: 'Availability overlaps with existing slot' },
          { status: 400 }
        )
      }
    }

    const id = generateId()
    const now = getCurrentTimestamp()

    console.log(`💾 [API ${requestId}] Inserting into database - ID: ${id}`)
    const newAvailability = await db
      .insert(teacherAvailability)
      .values({
        id,
        teacherId: validated.teacherId,
        schoolId: validated.schoolId,
        dayOfWeek: validated.dayOfWeek,
        startTime: validated.startTime,
        endTime: validated.endTime,
        isRecurring: validated.isRecurring,
        notes: validated.notes,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    console.log(`✅ [API ${requestId}] Insert successful - Returning ID: ${newAvailability[0].id}`)
    return NextResponse.json(newAvailability[0], { status: 201 })
  } catch (error) {
    console.error(`❌ [API ${requestId}] Error:`, error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

