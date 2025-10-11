import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, generateId, getCurrentTimestamp } from '@/lib/db';
import { classes, academicLevels } from '@/db/schema';
import { canAccessSchool, isSuperAdmin, isSchoolAdmin } from '@/lib/auth';

const createClassSchema = z.object({
  schoolId: z.string(),
  levelId: z.string(),
  name: z.string().min(1, 'Class name is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  capacity: z.number().int().min(1).max(100).optional(),
});

// GET /api/classes - List classes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    // Validate school access
    if (schoolId) {
      if (!canAccessSchool(session.user.role, session.user.schoolId, schoolId)) {
        return NextResponse.json(
          { message: 'Forbidden - Cannot access this school' },
          { status: 403 }
        );
      }
    }

    // Build query with appropriate filters
    let allClasses;
    const baseQuery = db
      .select({
        id: classes.id,
        schoolId: classes.schoolId,
        levelId: classes.levelId,
        name: classes.name,
        academicYear: classes.academicYear,
        capacity: classes.capacity,
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt,
        levelName: academicLevels.name,
      })
      .from(classes)
      .leftJoin(academicLevels, eq(classes.levelId, academicLevels.id));

    if (schoolId) {
      allClasses = await baseQuery
        .where(eq(classes.schoolId, schoolId))
        .orderBy(classes.createdAt);
    } else if (!isSuperAdmin(session.user.role) && session.user.schoolId) {
      allClasses = await baseQuery
        .where(eq(classes.schoolId, session.user.schoolId))
        .orderBy(classes.createdAt);
    } else {
      allClasses = await baseQuery.orderBy(classes.createdAt);
    }

    return NextResponse.json({ classes: allClasses });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/classes - Create new class
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can create classes
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { schoolId, levelId, name, academicYear, capacity } = createClassSchema.parse(body);

    // Validate school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this school' },
        { status: 403 }
      );
    }

    // Check if class with same name exists in the school
    const existingClass = await db
      .select()
      .from(classes)
      .where(and(
        eq(classes.schoolId, schoolId),
        eq(classes.name, name),
        eq(classes.academicYear, academicYear)
      ))
      .limit(1);

    if (existingClass.length > 0) {
      return NextResponse.json(
        { message: 'Class with this name already exists for this academic year' },
        { status: 400 }
      );
    }

    // Verify level exists and belongs to the school
    const level = await db
      .select()
      .from(academicLevels)
      .where(and(
        eq(academicLevels.id, levelId),
        eq(academicLevels.schoolId, schoolId)
      ))
      .limit(1);

    if (!level.length) {
      return NextResponse.json(
        { message: 'Academic level not found or does not belong to this school' },
        { status: 400 }
      );
    }

    const classId = generateId();
    const now = getCurrentTimestamp();

    const newClass = await db.insert(classes).values({
      id: classId,
      schoolId,
      levelId,
      name,
      academicYear,
      capacity: capacity || 30,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(
      { 
        message: 'Class created successfully',
        class: newClass[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating class:', error);
    
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
