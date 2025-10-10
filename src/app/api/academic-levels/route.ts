import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, generateId, getCurrentTimestamp } from '@/lib/db';
import { academicLevels } from '@/db/schema';
import { canAccessSchool, isSuperAdmin, isSchoolAdmin } from '@/lib/auth';

const createLevelSchema = z.object({
  schoolId: z.string(),
  name: z.string().min(1, 'Level name is required'),
  description: z.string().optional(),
});

// GET /api/academic-levels - List academic levels
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

    let query = db.select().from(academicLevels);

    // Filter by school if specified or user's school
    if (schoolId) {
      query = query.where(eq(academicLevels.schoolId, schoolId));
    } else if (!isSuperAdmin(session.user.role) && session.user.schoolId) {
      query = query.where(eq(academicLevels.schoolId, session.user.schoolId));
    }

    const levels = await query.orderBy(academicLevels.name);

    return NextResponse.json({ levels });
  } catch (error) {
    console.error('Error fetching academic levels:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/academic-levels - Create new academic level
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can create levels
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { schoolId, name, description } = createLevelSchema.parse(body);

    // Validate school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this school' },
        { status: 403 }
      );
    }

    // Check if level with same name exists in the school
    const existingLevel = await db
      .select()
      .from(academicLevels)
      .where(and(
        eq(academicLevels.schoolId, schoolId),
        eq(academicLevels.name, name)
      ))
      .limit(1);

    if (existingLevel.length > 0) {
      return NextResponse.json(
        { message: 'Academic level with this name already exists in this school' },
        { status: 400 }
      );
    }

    const levelId = generateId();
    const now = getCurrentTimestamp();

    const newLevel = await db.insert(academicLevels).values({
      id: levelId,
      schoolId,
      name,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(
      { 
        message: 'Academic level created successfully',
        level: newLevel[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating academic level:', error);
    
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
