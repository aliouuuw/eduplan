import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes, teacherClasses, subjects, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { generateId } from '@/lib/utils';

// Schema for cloning subjects
const cloneSubjectsSchema = z.object({
  sourceClassId: z.string().min(1, 'Source class ID is required'),
  cloneTeachers: z.boolean().default(true), // Whether to copy teacher assignments
  cloneWeeklyHours: z.boolean().default(true), // Whether to copy weekly hours
  skipConflicts: z.boolean().default(true), // Whether to skip existing assignments
});

/**
 * POST /api/classes/[classId]/clone-subjects
 * Clone subject assignments from another class
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
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
    const validated = cloneSubjectsSchema.parse(body);

    // Verify target class exists and belongs to school
    const targetClass = await db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.id, classId),
          schoolId ? eq(classes.schoolId, schoolId) : undefined
        )
      )
      .limit(1);

    if (targetClass.length === 0) {
      return NextResponse.json({ error: 'Target class not found or not authorized' }, { status: 404 });
    }

    // Verify source class exists and belongs to school
    const sourceClass = await db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.id, validated.sourceClassId),
          schoolId ? eq(classes.schoolId, schoolId) : undefined
        )
      )
      .limit(1);

    if (sourceClass.length === 0) {
      return NextResponse.json({ error: 'Source class not found or not authorized' }, { status: 404 });
    }

    // Get all subject assignments from source class
    const sourceAssignments = await db
      .select({
        subjectId: teacherClasses.subjectId,
        teacherId: teacherClasses.teacherId,
        weeklyHours: teacherClasses.weeklyHours,
        subjectName: subjects.name,
        teacherName: users.name,
      })
      .from(teacherClasses)
      .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
      .leftJoin(users, eq(teacherClasses.teacherId, users.id))
      .where(
        and(
          eq(teacherClasses.classId, validated.sourceClassId),
          schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined
        )
      );

    if (sourceAssignments.length === 0) {
      return NextResponse.json(
        { error: 'Source class has no subject assignments to clone' },
        { status: 400 }
      );
    }

    // Get existing assignments in target class
    const existingAssignments = await db
      .select({ subjectId: teacherClasses.subjectId })
      .from(teacherClasses)
      .where(
        and(
          eq(teacherClasses.classId, classId),
          schoolId ? eq(teacherClasses.schoolId, schoolId) : undefined
        )
      );

    const existingSubjectIds = new Set(existingAssignments.map(a => a.subjectId));

    // Clone assignments
    const cloned = [];
    const skipped = [];

    for (const assignment of sourceAssignments) {
      // Check if subject already assigned
      if (existingSubjectIds.has(assignment.subjectId)) {
        if (validated.skipConflicts) {
          skipped.push({
            subjectName: assignment.subjectName,
            reason: 'Already assigned to target class',
          });
          continue;
        }
      }

      const newAssignment = {
        id: generateId(),
        schoolId: schoolId || '',
        classId,
        subjectId: assignment.subjectId,
        teacherId: validated.cloneTeachers ? assignment.teacherId : '',
        weeklyHours: validated.cloneWeeklyHours ? assignment.weeklyHours : 0,
        createdAt: new Date(),
      };

      await db.insert(teacherClasses).values(newAssignment);

      cloned.push({
        subjectName: assignment.subjectName,
        teacherName: validated.cloneTeachers ? assignment.teacherName : null,
        weeklyHours: validated.cloneWeeklyHours ? assignment.weeklyHours : 0,
      });
    }

    return NextResponse.json(
      {
        message: 'Subject assignments cloned successfully',
        cloned: cloned.length,
        skipped: skipped.length,
        details: { cloned, skipped },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Error cloning subject assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

