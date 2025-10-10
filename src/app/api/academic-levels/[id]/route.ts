import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, getCurrentTimestamp } from '@/lib/db';
import { academicLevels, classes } from '@/db/schema';
import { canAccessSchool, isSuperAdmin, isSchoolAdmin } from '@/lib/auth';

const updateLevelSchema = z.object({
  name: z.string().min(1, 'Level name is required').optional(),
  description: z.string().optional(),
});

// GET /api/academic-levels/[id] - Get specific academic level
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const levelId = await params.id;

    const levelData = await db
      .select()
      .from(academicLevels)
      .where(eq(academicLevels.id, levelId))
      .limit(1);

    if (!levelData.length) {
      return NextResponse.json(
        { message: 'Academic level not found' },
        { status: 404 }
      );
    }

    const level = levelData[0];

    // Check if user can access this level's school
    if (!canAccessSchool(session.user.role, session.user.schoolId, level.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this academic level' },
        { status: 403 }
      );
    }

    return NextResponse.json({ level });
  } catch (error) {
    console.error('Error fetching academic level:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/academic-levels/[id] - Update academic level
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can update levels
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const levelId = await params.id;
    const body = await request.json();
    const updateData = updateLevelSchema.parse(body);

    // Check if level exists
    const existingLevel = await db
      .select()
      .from(academicLevels)
      .where(eq(academicLevels.id, levelId))
      .limit(1);

    if (!existingLevel.length) {
      return NextResponse.json(
        { message: 'Academic level not found' },
        { status: 404 }
      );
    }

    const level = existingLevel[0];

    // Check school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, level.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this academic level' },
        { status: 403 }
      );
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== level.name) {
      const duplicateLevel = await db
        .select()
        .from(academicLevels)
        .where(and(
          eq(academicLevels.schoolId, level.schoolId),
          eq(academicLevels.name, updateData.name)
        ))
        .limit(1);

      if (duplicateLevel.length > 0) {
        return NextResponse.json(
          { message: 'Academic level with this name already exists in this school' },
          { status: 400 }
        );
      }
    }

    // Update level
    const updatedLevel = await db
      .update(academicLevels)
      .set({
        ...updateData,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(academicLevels.id, levelId))
      .returning();

    return NextResponse.json({
      message: 'Academic level updated successfully',
      level: updatedLevel[0]
    });
  } catch (error) {
    console.error('Error updating academic level:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/academic-levels/[id] - Delete academic level
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can delete levels
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const levelId = await params.id;

    // Check if level exists
    const existingLevel = await db
      .select()
      .from(academicLevels)
      .where(eq(academicLevels.id, levelId))
      .limit(1);

    if (!existingLevel.length) {
      return NextResponse.json(
        { message: 'Academic level not found' },
        { status: 404 }
      );
    }

    const level = existingLevel[0];

    // Check school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, level.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this academic level' },
        { status: 403 }
      );
    }

    // Check if level has any classes assigned
    const levelClasses = await db
      .select()
      .from(classes)
      .where(eq(classes.levelId, levelId))
      .limit(1);

    if (levelClasses.length > 0) {
      return NextResponse.json(
        { message: 'Cannot delete academic level with assigned classes. Please reassign or delete the classes first.' },
        { status: 400 }
      );
    }

    // Delete level
    await db
      .delete(academicLevels)
      .where(eq(academicLevels.id, levelId));

    return NextResponse.json({
      message: 'Academic level deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting academic level:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

