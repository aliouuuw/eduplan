import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, getCurrentTimestamp } from '@/lib/db';
import { subjects } from '@/db/schema';
import { canAccessSchool, isSuperAdmin, isSchoolAdmin } from '@/lib/auth';

const updateSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').optional(),
  code: z.string().optional(),
  description: z.string().optional(),
});

// GET /api/subjects/[id] - Get specific subject
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

    const subjectId = params.id;

    const subjectData = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (!subjectData.length) {
      return NextResponse.json(
        { message: 'Subject not found' },
        { status: 404 }
      );
    }

    const subject = subjectData[0];

    // Check if user can access this subject's school
    if (!canAccessSchool(session.user.role, session.user.schoolId, subject.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this subject' },
        { status: 403 }
      );
    }

    return NextResponse.json({ subject });
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/subjects/[id] - Update subject
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

    // Only superadmin and school admin can update subjects
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const subjectId = params.id;
    const body = await request.json();
    const updateData = updateSubjectSchema.parse(body);

    // Check if subject exists
    const existingSubject = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (!existingSubject.length) {
      return NextResponse.json(
        { message: 'Subject not found' },
        { status: 404 }
      );
    }

    const subject = existingSubject[0];

    // Check school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, subject.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this subject' },
        { status: 403 }
      );
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== subject.name) {
      const duplicateSubject = await db
        .select()
        .from(subjects)
        .where(and(
          eq(subjects.schoolId, subject.schoolId),
          eq(subjects.name, updateData.name)
        ))
        .limit(1);

      if (duplicateSubject.length > 0) {
        return NextResponse.json(
          { message: 'Subject with this name already exists in this school' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate code if code is being updated
    if (updateData.code && updateData.code !== subject.code) {
      const duplicateCode = await db
        .select()
        .from(subjects)
        .where(and(
          eq(subjects.schoolId, subject.schoolId),
          eq(subjects.code, updateData.code)
        ))
        .limit(1);

      if (duplicateCode.length > 0) {
        return NextResponse.json(
          { message: 'Subject code already exists in this school' },
          { status: 400 }
        );
      }
    }

    // Update subject
    const updatedSubject = await db
      .update(subjects)
      .set({
        ...updateData,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(subjects.id, subjectId))
      .returning();

    return NextResponse.json({
      message: 'Subject updated successfully',
      subject: updatedSubject[0]
    });
  } catch (error) {
    console.error('Error updating subject:', error);

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

// DELETE /api/subjects/[id] - Delete subject
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

    // Only superadmin and school admin can delete subjects
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const subjectId = params.id;

    // Check if subject exists
    const existingSubject = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (!existingSubject.length) {
      return NextResponse.json(
        { message: 'Subject not found' },
        { status: 404 }
      );
    }

    const subject = existingSubject[0];

    // Check school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, subject.schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this subject' },
        { status: 403 }
      );
    }

    // Delete subject
    await db
      .delete(subjects)
      .where(eq(subjects.id, subjectId));

    return NextResponse.json({
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
