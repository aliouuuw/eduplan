
import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  classes,
  teacherClasses, // This table links teachers to subjects within classes
  subjects,
  users
} from '@/db/schema';
import { eq, and, InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { z } from 'zod';
import { generateId } from '@/lib/utils';

type TeacherAssignment = InferSelectModel<typeof teacherClasses>;
type NewTeacherAssignment = InferInsertModel<typeof teacherClasses>;

// Schema for assigning/updating a teacher to a subject for a class
const teacherAssignmentSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
  subjectIds: z.array(z.string().min(1, 'Subject ID is required')).min(1, 'At least one subject ID is required'),
});

/**
 * GET /api/classes/[classId]/teachers
 * Get teachers assigned to subjects for a specific class
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

    // Fetch all teacher-subject assignments for this class
    const assignments = await db.select({
      assignmentId: teacherClasses.id,
      teacherId: users.id,
      teacherName: users.name,
      teacherEmail: users.email,
      subjectId: subjects.id,
      subjectName: subjects.name,
      weeklyHours: teacherClasses.weeklyHours,
      academicYear: classes.academicYear,
    })
    .from(teacherClasses)
    .innerJoin(users, eq(teacherClasses.teacherId, users.id))
    .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
    .innerJoin(classes, eq(teacherClasses.classId, classes.id))
    .where(
      and(
        eq(teacherClasses.classId, classId),
        ...(schoolId ? [eq(teacherClasses.schoolId, schoolId)] : [])
      )
    );

    // Group assignments by teacher for a cleaner response
    const teachersWithSubjects = assignments.reduce((acc: any, assignment) => {
      const teacher = acc[assignment.teacherId] || {
        id: assignment.teacherId,
        name: assignment.teacherName,
        email: assignment.teacherEmail,
        subjects: [],
      };
      teacher.subjects.push({
        id: assignment.subjectId,
        name: assignment.subjectName,
        weeklyHours: assignment.weeklyHours,
        academicYear: assignment.academicYear,
        assignmentId: assignment.assignmentId,
      });
      acc[assignment.teacherId] = teacher;
      return acc;
    }, {});

    return NextResponse.json({ teachers: Object.values(teachersWithSubjects) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class teachers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/classes/[classId]/teachers
 * Assign a teacher to one or more subjects for a specific class
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
    const validated = teacherAssignmentSchema.parse(body);
    const { teacherId, subjectIds } = validated;

    // Verify the class belongs to the school
    const classRecord = await db.select().from(classes).where(
      and(
        eq(classes.id, classId),
        schoolId ? eq(classes.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (classRecord.length === 0) {
      return NextResponse.json({ error: 'Class not found or not authorized' }, { status: 404 });
    }
    const academicYear = classRecord[0].academicYear;

    // Verify the teacher exists and belongs to the school
    const teacherExists = await db.select().from(users).where(
      and(
        eq(users.id, teacherId),
        eq(users.role, 'teacher'),
        schoolId ? eq(users.schoolId, schoolId) : undefined
      )
    ).limit(1);

    if (teacherExists.length === 0) {
      return NextResponse.json({ error: 'Teacher not found or not authorized' }, { status: 404 });
    }

    const newAssignments: NewTeacherAssignment[] = [];
    const updatedAssignments: TeacherAssignment[] = [];

    for (const subjectId of subjectIds) {
      // Check if subject exists and belongs to school
      const subjectExists = await db.select().from(subjects).where(
        and(
          eq(subjects.id, subjectId),
          schoolId ? eq(subjects.schoolId, schoolId) : undefined
        )
      ).limit(1);

      if (subjectExists.length === 0) {
        // Optionally, skip this subject or return an error for it
        console.warn(`Subject ${subjectId} not found or not authorized. Skipping assignment.`);
        continue;
      }

      // Check for existing assignment
      const existingAssignment = await db.select().from(teacherClasses).where(
        and(
          eq(teacherClasses.classId, classId),
          eq(teacherClasses.subjectId, subjectId),
          eq(teacherClasses.teacherId, teacherId),
          schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined
        )
      ).limit(1);

      if (existingAssignment.length > 0) {
        updatedAssignments.push(existingAssignment[0]); // Already exists, no action needed
      } else {
        newAssignments.push({
          id: generateId(),
          schoolId: schoolId || '',
          classId,
          subjectId,
          teacherId,
          academicYear,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (newAssignments.length > 0) {
      const inserted = await db.insert(teacherClasses).values(newAssignments).returning();
      inserted.forEach(item => updatedAssignments.push(item));
    }

    if (updatedAssignments.length === 0) {
      return NextResponse.json({ message: 'No new assignments created or updated' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Teacher(s) assigned to subject(s) successfully', assignments: updatedAssignments }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error('Error assigning teacher to class subjects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/classes/[classId]/teachers
 * Remove a teacher from specific subjects for a class
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
    const teacherId = searchParams.get('teacherId');
    const subjectId = searchParams.get('subjectId'); // Optional: delete specific subject assignment

    if (!classId || !teacherId) {
      return NextResponse.json({ error: 'Class ID and Teacher ID are required' }, { status: 400 });
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

    // Build WHERE condition for deletion
    const whereConditions = [
      eq(teacherClasses.classId, classId),
      eq(teacherClasses.teacherId, teacherId),
      schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined,
    ];
    if (subjectId) {
      whereConditions.push(eq(teacherClasses.subjectId, subjectId));
    }

    const deletedAssignments = await db.delete(teacherClasses)
      .where(and(...whereConditions.filter(Boolean) as any[]))
      .returning();

    if (deletedAssignments.length === 0) {
      return NextResponse.json(
        { error: subjectId ? 'Teacher not assigned to this subject in this class' : 'Teacher not assigned to any subjects in this class' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: subjectId ? 'Teacher unassigned from subject successfully' : 'Teacher unassigned from all subjects in class successfully', deletedAssignments },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error unassigning teacher from class subjects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
