import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, getCurrentTimestamp } from '@/lib/db';
import { classes } from '@/db/schema';
import { canAccessSchool, isSuperAdmin, isSchoolAdmin } from '@/lib/auth';

const updateClassSchema = z.object({
  levelId: z.string().optional(),
  name: z.string().min(1, 'Class name is required').optional(),
  academicYear: z.string().min(1, 'Academic year is required').optional(),
  capacity: z.number().int().min(1).max(100).optional(),
});

// GET /api/classes/[id] - Get specific class
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: classId } = await params;

    const classData = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);

    if (!classData.length) {
      return NextResponse.json(
        { message: 'Class not found' },
        { status: 404 }
      );
    }

    const classItem = classData[0];

    // Check if user can access this class's school
    if (!canAccessSchool(session.user.role, session.user.schoolId, classItem.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this class' },
        { status: 403 }
      );
    }

    return NextResponse.json({ class: classItem });
  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/classes/[id] - Update class
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can update classes
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id: classId } = await params;
    const body = await request.json();
    const updateData = updateClassSchema.parse(body);

    // Check if class exists
    const existingClass = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);

    if (!existingClass.length) {
      return NextResponse.json(
        { message: 'Class not found' },
        { status: 404 }
      );
    }

    const classItem = existingClass[0];

    // Check school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, classItem.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this class' },
        { status: 403 }
      );
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== classItem.name) {
      const duplicateClass = await db
        .select()
        .from(classes)
        .where(and(
          eq(classes.schoolId, classItem.schoolId),
          eq(classes.name, updateData.name),
          eq(classes.academicYear, updateData.academicYear || classItem.academicYear)
        ))
        .limit(1);

      if (duplicateClass.length > 0) {
        return NextResponse.json(
          { message: 'Class with this name already exists for this academic year' },
          { status: 400 }
        );
      }
    }

    // Update class
    const updatedClass = await db
      .update(classes)
      .set({
        ...updateData,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(classes.id, classId))
      .returning();

    return NextResponse.json({
      message: 'Class updated successfully',
      class: updatedClass[0]
    });
  } catch (error) {
    console.error('Error updating class:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/classes/[id] - Delete class
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can delete classes
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id: classId } = await params;

    // Check if class exists
    const existingClass = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);

    if (!existingClass.length) {
      return NextResponse.json(
        { message: 'Class not found' },
        { status: 404 }
      );
    }

    const classItem = existingClass[0];

    // Check school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, classItem.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this class' },
        { status: 403 }
      );
    }

    // Delete class
    await db
      .delete(classes)
      .where(eq(classes.id, classId));

    return NextResponse.json({
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

