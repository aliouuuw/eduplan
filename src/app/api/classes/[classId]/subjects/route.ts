
import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  classes,
  subjects,
  teacherClasses, // This table is used for subject assignments to classes
  users
} from '@/db/schema';
import { eq, and, InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { z } from 'zod';
import { generateId } from '@/lib/utils';

type ClassSubjectAssignment = InferSelectModel<typeof teacherClasses>;
type NewClassSubjectAssignment = InferInsertModel<typeof teacherClasses>;

// Schema for assigning/updating a subject to a class
const classSubjectAssignmentSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  teacherId: z.string().optional(), // Teacher is optional when assigning subject to class
  weeklyHours: z.number().min(0, 'Weekly hours cannot be negative').optional(),
});

/**
 * GET /api/classes/[classId]/subjects
 * Get subjects assigned to a specific class with their weekly quotas
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { classId } = await params;
    const schoolId = session.user.schoolId;

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Verify the class belongs to the school
    const classExists = await db.select().from(classes).where(
      and(
        eq(classes.id, classId),
        schoolId ? eq(classes.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (classExists.length === 0) {
      return NextResponse.json({ error: 'Class not found or not authorized' }, { status: 404 });
    }

    // Fetch subjects assigned to this class
    // Note: teacherClasses links subjects to classes. We need to query through it
    const assignedSubjects = await db.select({
      id: teacherClasses.id, // ID of the assignment
      subjectId: subjects.id,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      subjectDescription: subjects.description,
      subjectWeeklyHours: subjects.weeklyHours,
      teacherId: users.id,
      teacherName: users.name,
      teacherEmail: users.email,
      academicYear: classes.academicYear,
    })
    .from(teacherClasses)
    .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
    .innerJoin(classes, eq(teacherClasses.classId, classes.id))
    .leftJoin(users, eq(teacherClasses.teacherId, users.id)) // Teacher can be null for a subject assignment
    .where(
      and(
        eq(teacherClasses.classId, classId),
        ...(schoolId ? [eq(teacherClasses.schoolId, schoolId)] : [])
      )
    );

    return NextResponse.json({ assignedSubjects }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/classes/[classId]/subjects
 * Assign a subject to a class or update its weekly hours (if already assigned)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { classId } = await params;
    const schoolId = session.user.schoolId;

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validated = classSubjectAssignmentSchema.parse(body);

    // Verify the class belongs to the school
    const classExists = await db.select().from(classes).where(
      and(
        eq(classes.id, classId),
        schoolId ? eq(classes.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (classExists.length === 0) {
      return NextResponse.json({ error: 'Class not found or not authorized' }, { status: 404 });
    }

    // Check if the subject exists and belongs to the school
    const subjectExists = await db.select().from(subjects).where(
      and(
        eq(subjects.id, validated.subjectId),
        schoolId ? eq(subjects.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (subjectExists.length === 0) {
      return NextResponse.json({ error: 'Subject not found or not authorized' }, { status: 404 });
    }

    // Check if this subject is already assigned to this class
    const existingAssignment = await db.select().from(teacherClasses).where(
      and(
        eq(teacherClasses.classId, classId),
        eq(teacherClasses.subjectId, validated.subjectId),
        schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined
      )
    ).limit(1);

    let assignment;
    if (existingAssignment.length > 0) {
      // Update existing assignment (e.g., weekly hours, teacher)
      const updateData: Partial<NewClassSubjectAssignment> = {};
      if (validated.weeklyHours !== undefined) {
        // Note: weeklyHours is on the subject table, not teacherClasses.
        // We'll need a mechanism to link subject's weeklyHours to class context
        // For now, let's assume this POST is primarily for assignment, 
        // and updating weeklyHours for subjects happens via the subject form directly.
        // If we want per-class weeklyHours, it needs to be added to teacherClasses schema.
        // For now, this is a placeholder / conceptual update. The actual weeklyHours
        // will come from the subject definition for auto-scheduling.
      }
      if (validated.teacherId !== undefined) {
        // This will assign a teacher to a subject for this class
        updateData.teacherId = validated.teacherId;
      }

      if (Object.keys(updateData).length > 0) {
        assignment = await db.update(teacherClasses)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(teacherClasses.id, existingAssignment[0].id))
          .returning();
      }
    } else {
      // Create new assignment
      const newAssignment: NewClassSubjectAssignment = {
        id: generateId(),
        schoolId: schoolId || '',
        classId,
        subjectId: validated.subjectId,
        teacherId: validated.teacherId || null, // Allow null if no teacher specified yet
        academicYear: classExists[0].academicYear, // Inherit from class
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      assignment = await db.insert(teacherClasses).values(newAssignment).returning();
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Failed to assign or update subject for class' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Subject assigned/updated successfully', assignment: assignment[0] }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('Error assigning subject to class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/classes/[classId]/subjects
 * Unassign a subject from a class
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { classId } = await params;
    const schoolId = session.user.schoolId;
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    if (!classId || !subjectId) {
      return NextResponse.json({ error: 'Class ID and Subject ID are required' }, { status: 400 });
    }

    // Verify the class belongs to the school
    const classExists = await db.select().from(classes).where(
      and(
        eq(classes.id, classId),
        schoolId ? eq(classes.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (classExists.length === 0) {
      return NextResponse.json({ error: 'Class not found or not authorized' }, { status: 404 });
    }

    // Check if the subject is assigned to the class
    const assignmentExists = await db.select().from(teacherClasses).where(
      and(
        eq(teacherClasses.classId, classId),
        eq(teacherClasses.subjectId, subjectId),
        schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (assignmentExists.length === 0) {
      return NextResponse.json({ error: 'Subject not assigned to this class' }, { status: 404 });
    }

    // Delete the assignment
    await db.delete(teacherClasses).where(eq(teacherClasses.id, assignmentExists[0].id));

    return NextResponse.json({ message: 'Subject unassigned successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error unassigning subject from class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/classes/[classId]/subjects
 * Update an existing subject assignment for a class (e.g., assign/reassign teacher)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { classId } = await params;
    const schoolId = session.user.schoolId;
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    if (!classId || !subjectId) {
      return NextResponse.json({ error: 'Class ID and Subject ID are required' }, { status: 400 });
    }

    const body = await request.json();
    const validated = classSubjectAssignmentSchema.parse(body);

    // Verify the class belongs to the school
    const classExists = await db.select().from(classes).where(
      and(
        eq(classes.id, classId),
        schoolId ? eq(classes.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (classExists.length === 0) {
      return NextResponse.json({ error: 'Class not found or not authorized' }, { status: 404 });
    }

    // Check if the subject is assigned to the class
    const assignmentExists = await db.select().from(teacherClasses).where(
      and(
        eq(teacherClasses.classId, classId),
        eq(teacherClasses.subjectId, subjectId),
        schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (assignmentExists.length === 0) {
      return NextResponse.json({ error: 'Subject not assigned to this class' }, { status: 404 });
    }

    const updateData: Partial<NewClassSubjectAssignment> = {};
    if (validated.teacherId !== undefined) {
      updateData.teacherId = validated.teacherId;
    }
    // If weeklyHours is meant to be updated per-class, it needs to be in teacherClasses schema
    // For now, it's ignored here as it belongs to the global subject definition.

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No updatable fields provided' }, { status: 400 });
    }

    const updatedAssignment = await db.update(teacherClasses)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(teacherClasses.id, assignmentExists[0].id))
      .returning();

    return NextResponse.json({ message: 'Subject assignment updated successfully', assignment: updatedAssignment[0] }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('Error updating subject assignment for class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
