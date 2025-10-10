import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, getCurrentTimestamp } from '@/lib/db';
import { schools } from '@/db/schema';
import { isSuperAdmin, canAccessSchool } from '@/lib/auth';

const updateSchoolSchema = z.object({
  name: z.string().min(2, 'School name must be at least 2 characters').optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logo: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/schools/[id] - Get school by ID
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

    const schoolId = await params.id;

    // Check access permissions
    if (!isSuperAdmin(session.user.role) && !canAccessSchool(session.user.role, session.user.schoolId, schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this school' },
        { status: 403 }
      );
    }

    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (!school.length) {
      return NextResponse.json(
        { message: 'School not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ school: school[0] });
  } catch (error) {
    console.error('Error fetching school:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/schools/[id] - Update school
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

    const schoolId = await params.id;

    // Only superadmin can update schools
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Superadmin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData = updateSchoolSchema.parse(body);

    // Check if school exists
    const existingSchool = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (!existingSchool.length) {
      return NextResponse.json(
        { message: 'School not found' },
        { status: 404 }
      );
    }

    // Update school
    const updatedSchool = await db
      .update(schools)
      .set({
        ...updateData,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(schools.id, schoolId))
      .returning();

    return NextResponse.json({
      message: 'School updated successfully',
      school: updatedSchool[0]
    });
  } catch (error) {
    console.error('Error updating school:', error);
    
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

// DELETE /api/schools/[id] - Delete school (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Unauthorized - Superadmin access required' },
        { status: 403 }
      );
    }

    const schoolId = await params.id;

    // Check if school exists
    const existingSchool = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (!existingSchool.length) {
      return NextResponse.json(
        { message: 'School not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await db
      .update(schools)
      .set({
        isActive: false,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(schools.id, schoolId));

    return NextResponse.json({
      message: 'School deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting school:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
