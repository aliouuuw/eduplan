import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { studentEnrollments, users, classes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { generateId } from '@/lib/utils';

// Get current timestamp
function getCurrentTimestamp(): Date {
  return new Date();
}

// Validation schema
const enrollmentSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1),
  schoolId: z.string().min(1),
  academicYear: z.string().min(1),
});

/**
 * GET /api/student-enrollments
 * Get enrollments for a specific student or class
 * Query params: studentId (optional), classId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const schoolId = session.user.schoolId;

    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    let query = db
      .select({
        id: studentEnrollments.id,
        studentId: studentEnrollments.studentId,
        studentName: users.name,
        studentEmail: users.email,
        classId: studentEnrollments.classId,
        className: classes.name,
        academicYear: studentEnrollments.academicYear,
        enrollmentDate: studentEnrollments.enrollmentDate,
        isActive: studentEnrollments.isActive,
      })
      .from(studentEnrollments)
      .innerJoin(users, eq(studentEnrollments.studentId, users.id))
      .innerJoin(classes, eq(studentEnrollments.classId, classes.id));

    const conditions = [];

    if (schoolId) {
      conditions.push(eq(studentEnrollments.schoolId, schoolId));
    }

    if (studentId) {
      conditions.push(eq(studentEnrollments.studentId, studentId));
    }

    if (classId) {
      conditions.push(eq(studentEnrollments.classId, classId));
    }

    conditions.push(eq(studentEnrollments.isActive, true));

    const enrollments = await query.where(and(...conditions));

    return NextResponse.json(enrollments);
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/student-enrollments
 * Create new student enrollment
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
    const validated = enrollmentSchema.parse(body);

    // Verify school access
    if (isSchoolAdmin(session.user.role) && validated.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Cannot create enrollments for other schools' },
        { status: 403 }
      );
    }

    // Verify student exists and is in the school
    const student = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, validated.studentId),
          eq(users.schoolId, validated.schoolId),
          eq(users.role, 'student')
        )
      )
      .limit(1);

    if (student.length === 0) {
      return NextResponse.json(
        { error: 'Student not found or not in this school' },
        { status: 404 }
      );
    }

    // Verify class exists and is in the school
    const classRecord = await db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.id, validated.classId),
          eq(classes.schoolId, validated.schoolId)
        )
      )
      .limit(1);

    if (classRecord.length === 0) {
      return NextResponse.json(
        { error: 'Class not found or not in this school' },
        { status: 404 }
      );
    }

    // Check if student is already enrolled in this class for this academic year
    const existing = await db
      .select()
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.studentId, validated.studentId),
          eq(studentEnrollments.classId, validated.classId),
          eq(studentEnrollments.academicYear, validated.academicYear),
          eq(studentEnrollments.isActive, true)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Student already enrolled in this class for this academic year' },
        { status: 400 }
      );
    }

    // Check class capacity
    const enrolledCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.classId, validated.classId),
          eq(studentEnrollments.isActive, true)
        )
      );

    const currentCount = Number(enrolledCount[0]?.count || 0);
    const capacity = classRecord[0].capacity || 30;

    if (currentCount >= capacity) {
      return NextResponse.json(
        { error: `Class is at full capacity (${capacity} students)` },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = getCurrentTimestamp();

    const newEnrollment = await db
      .insert(studentEnrollments)
      .values({
        id,
        studentId: validated.studentId,
        classId: validated.classId,
        schoolId: validated.schoolId,
        academicYear: validated.academicYear,
        enrollmentDate: now,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newEnrollment[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('Error creating student enrollment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

