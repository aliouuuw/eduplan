import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, teacherAvailability } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';

/**
 * GET /api/teachers
 * Get teachers with optional availability information
 * Query params:
 * - includeAvailability: boolean - Include availability count and status
 * - schoolId: string (optional, for superadmins)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeAvailability = searchParams.get('includeAvailability') === 'true';
    const requestedSchoolId = searchParams.get('schoolId');

    const schoolId = requestedSchoolId || session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Only admins and superadmins can access this endpoint
    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get all teachers for the school
    const teachers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        schoolId: users.schoolId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'teacher'),
          eq(users.schoolId, schoolId)
        )
      )
      .orderBy(users.name);

    // If availability info is requested, add it to each teacher
    if (includeAvailability) {
      const teachersWithAvailability = await Promise.all(
        teachers.map(async (teacher) => {
          // Count availability slots for this teacher
          const availabilitySlots = await db
            .select({ count: count(teacherAvailability.id) })
            .from(teacherAvailability)
            .where(
              and(
                eq(teacherAvailability.teacherId, teacher.id),
                eq(teacherAvailability.schoolId, schoolId)
              )
            );

          const availabilityCount = availabilitySlots[0]?.count || 0;

          return {
            ...teacher,
            availabilityCount,
            hasAvailability: availabilityCount > 0,
          };
        })
      );

      return NextResponse.json({ teachers: teachersWithAvailability }, { status: 200 });
    }

    // Return teachers without availability info
    return NextResponse.json({ teachers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
