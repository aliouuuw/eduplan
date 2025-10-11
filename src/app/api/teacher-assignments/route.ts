import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { teacherClasses, teacherSubjects, users, classes, subjects, teacherAvailability, timeSlots, timetables } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
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
const assignSubjectSchema = z.object({
  teacherId: z.string().min(1),
  subjectId: z.string().min(1),
  schoolId: z.string().min(1),
});

const assignClassSchema = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  schoolId: z.string().min(1),
});

/**
 * GET /api/teacher-assignments
 * Get assignments for a specific teacher or class
 * Query params: teacherId (optional), classId (optional)
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
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');

    const schoolId = session.user.schoolId;

    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // If classId is provided, get all teacher-subject assignments for that class
    if (classId) {
      const assignments = await db
        .select({
          id: teacherClasses.id,
          teacherId: users.id,
          teacherName: users.name,
          teacherEmail: users.email,
          classId: classes.id,
          className: classes.name,
          subjectId: subjects.id,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          academicYear: classes.academicYear,
          createdAt: teacherClasses.createdAt,
        })
        .from(teacherClasses)
        .innerJoin(users, eq(teacherClasses.teacherId, users.id))
        .innerJoin(classes, eq(teacherClasses.classId, classes.id))
        .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
        .where(
          schoolId
            ? and(
                eq(teacherClasses.classId, classId),
                eq(teacherClasses.schoolId, schoolId)
              )
            : eq(teacherClasses.classId, classId)
        );

      return NextResponse.json({
        assignments,
      });
    }

    // Original teacher-specific logic
    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID or Class ID is required' }, { status: 400 });
    }

    // Get teacher's subject assignments
    const subjectAssignments = await db
      .select({
        id: teacherSubjects.id,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        createdAt: teacherSubjects.createdAt,
      })
      .from(teacherSubjects)
      .innerJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
      .where(
        schoolId
          ? and(
              eq(teacherSubjects.teacherId, teacherId),
              eq(teacherSubjects.schoolId, schoolId)
            )
          : eq(teacherSubjects.teacherId, teacherId)
      );

    // Get teacher's class assignments
    const classAssignments = await db
      .select({
        id: teacherClasses.id,
        classId: classes.id,
        className: classes.name,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        academicYear: classes.academicYear,
        createdAt: teacherClasses.createdAt,
      })
      .from(teacherClasses)
      .innerJoin(classes, eq(teacherClasses.classId, classes.id))
      .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
      .where(
        schoolId
          ? and(
              eq(teacherClasses.teacherId, teacherId),
              eq(teacherClasses.schoolId, schoolId)
            )
          : eq(teacherClasses.teacherId, teacherId)
      );

    return NextResponse.json({
      subjects: subjectAssignments,
      classes: classAssignments,
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/teacher-assignments
 * Create new assignment (subject or class)
 * Body: { type: 'subject' | 'class', ...assignmentData }
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
    const { type, ...data } = body;

    if (!type || (type !== 'subject' && type !== 'class')) {
      return NextResponse.json(
        { error: 'Type must be either "subject" or "class"' },
        { status: 400 }
      );
    }

    // Verify school access
    if (isSchoolAdmin(session.user.role) && data.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Cannot create assignments for other schools' },
        { status: 403 }
      );
    }

    if (type === 'subject') {
      const validated = assignSubjectSchema.parse(data);

      // Verify teacher exists and is in the school
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
        .limit(1);

      if (teacher.length === 0) {
        return NextResponse.json(
          { error: 'Teacher not found or not in this school' },
          { status: 404 }
        );
      }

      // Verify subject exists and is in the school
      const subject = await db
        .select()
        .from(subjects)
        .where(
          and(
            eq(subjects.id, validated.subjectId),
            eq(subjects.schoolId, validated.schoolId)
          )
        )
        .limit(1);

      if (subject.length === 0) {
        return NextResponse.json(
          { error: 'Subject not found or not in this school' },
          { status: 404 }
        );
      }

      // Check if assignment already exists
      const existing = await db
        .select()
        .from(teacherSubjects)
        .where(
          and(
            eq(teacherSubjects.teacherId, validated.teacherId),
            eq(teacherSubjects.subjectId, validated.subjectId),
            eq(teacherSubjects.schoolId, validated.schoolId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Teacher already assigned to this subject' },
          { status: 400 }
        );
      }

      const id = generateId();
      const now = getCurrentTimestamp();

      const newAssignment = await db
        .insert(teacherSubjects)
        .values({
          id,
          teacherId: validated.teacherId,
          subjectId: validated.subjectId,
          schoolId: validated.schoolId,
          createdAt: now,
        })
        .returning();

      return NextResponse.json(newAssignment[0], { status: 201 });
    } else {
      // type === 'class'
      const validated = assignClassSchema.parse(data);

      // Verify teacher exists and is in the school
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
        .limit(1);

      if (teacher.length === 0) {
        return NextResponse.json(
          { error: 'Teacher not found or not in this school' },
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

      // Verify subject exists and teacher is assigned to it
      const teacherSubject = await db
        .select()
        .from(teacherSubjects)
        .where(
          and(
            eq(teacherSubjects.teacherId, validated.teacherId),
            eq(teacherSubjects.subjectId, validated.subjectId),
            eq(teacherSubjects.schoolId, validated.schoolId)
          )
        )
        .limit(1);

      if (teacherSubject.length === 0) {
        return NextResponse.json(
          { error: 'Teacher must be assigned to the subject first' },
          { status: 400 }
        );
      }

      // Check if assignment already exists
      const existing = await db
        .select()
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, validated.teacherId),
            eq(teacherClasses.classId, validated.classId),
            eq(teacherClasses.subjectId, validated.subjectId),
            eq(teacherClasses.schoolId, validated.schoolId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Teacher already assigned to this class for this subject' },
          { status: 400 }
        );
      }

      const id = generateId();
      const now = getCurrentTimestamp();

      const newAssignment = await db
        .insert(teacherClasses)
        .values({
          id,
          teacherId: validated.teacherId,
          classId: validated.classId,
          subjectId: validated.subjectId,
          schoolId: validated.schoolId,
          createdAt: now,
        })
        .returning();

      return NextResponse.json(newAssignment[0], { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('Error creating teacher assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

