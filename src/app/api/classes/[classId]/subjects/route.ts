
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
import { validateTeacherAssignment, ensureTeacherQualification } from '@/lib/assignment-validation';

type ClassSubjectAssignment = InferSelectModel<typeof teacherClasses>;
type NewClassSubjectAssignment = InferInsertModel<typeof teacherClasses>;

// Schema for assigning/updating a subject to a class
const classSubjectAssignmentSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  teacherId: z.string().optional(), // Teacher is optional when assigning subject to class
  weeklyHours: z.number().min(0, 'Weekly hours cannot be negative').optional(),
  autoQualify: z.boolean().optional().default(true), // Auto-create teacher qualification if missing
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
      weeklyHours: teacherClasses.weeklyHours, // Class-specific weekly hours
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

    // Validate assignment if teacher is specified
    const warnings = [];
    if (validated.teacherId && validated.weeklyHours) {
      const validationWarnings = await validateTeacherAssignment(
        validated.teacherId,
        validated.subjectId,
        classId,
        validated.weeklyHours,
        schoolId || ''
      );
      warnings.push(...validationWarnings);

      // Check for errors (blocking issues)
      const errors = validationWarnings.filter(w => w.type === 'error');
      if (errors.length > 0 && !existingAssignment.length) {
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            warnings: validationWarnings,
            canProceed: false 
          },
          { status: 400 }
        );
      }

      // Auto-qualify teacher if requested and not qualified
      if (validated.autoQualify && validated.teacherId) {
        const { created } = await ensureTeacherQualification(
          validated.teacherId,
          validated.subjectId,
          schoolId || ''
        );
        if (created) {
          warnings.push({
            type: 'info',
            message: 'Teacher qualification created',
            details: 'This teacher has been automatically qualified to teach this subject.',
          });
        }
      }
    }

    let assignment;
    if (existingAssignment.length > 0) {
      // Update existing assignment (e.g., weekly hours, teacher)
      const updateData: Partial<NewClassSubjectAssignment> = {};
      if (validated.weeklyHours !== undefined) {
        updateData.weeklyHours = validated.weeklyHours;
      }
      if (validated.teacherId !== undefined) {
        updateData.teacherId = validated.teacherId;
      }

      if (Object.keys(updateData).length > 0) {
        assignment = await db.update(teacherClasses)
          .set(updateData)
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
        teacherId: validated.teacherId || '', // Default to empty string if no teacher specified yet
        weeklyHours: validated.weeklyHours || 0,
        createdAt: new Date(),
      };
      assignment = await db.insert(teacherClasses).values(newAssignment).returning();
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Failed to assign or update subject for class' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Subject assigned/updated successfully', 
      assignment: assignment[0],
      warnings 
    }, { status: 200 });

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

    // Validate assignment if teacher is specified and has weekly hours
    const warnings = [];
    if (validated.teacherId && assignmentExists[0].weeklyHours) {
      const validationWarnings = await validateTeacherAssignment(
        validated.teacherId,
        subjectId,
        classId,
        assignmentExists[0].weeklyHours,
        schoolId || ''
      );
      warnings.push(...validationWarnings);

      // Check for errors (blocking issues)
      const errors = validationWarnings.filter(w => w.type === 'error');
      if (errors.length > 0) {
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            warnings: validationWarnings,
            canProceed: false 
          },
          { status: 400 }
        );
      }

      // Auto-qualify teacher if requested and not qualified
      if (validated.autoQualify && validated.teacherId) {
        const { created } = await ensureTeacherQualification(
          validated.teacherId,
          subjectId,
          schoolId || ''
        );
        if (created) {
          warnings.push({
            type: 'info',
            message: 'Teacher qualification created',
            details: 'This teacher has been automatically qualified to teach this subject.',
          });
        }
      }
    }

    const updateData: Partial<NewClassSubjectAssignment> = {};
    if (validated.teacherId !== undefined) {
      updateData.teacherId = validated.teacherId;
    }
    if (validated.weeklyHours !== undefined) {
      updateData.weeklyHours = validated.weeklyHours;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No updatable fields provided' }, { status: 400 });
    }

    const updatedAssignment = await db.update(teacherClasses)
      .set(updateData)
      .where(eq(teacherClasses.id, assignmentExists[0].id))
      .returning();

    return NextResponse.json({ 
      message: 'Subject assignment updated successfully', 
      assignment: updatedAssignment[0],
      warnings 
    }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('Error updating subject assignment for class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
