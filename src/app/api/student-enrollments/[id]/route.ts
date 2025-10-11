import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { studentEnrollments } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Get current timestamp
function getCurrentTimestamp(): Date {
  return new Date();
}

/**
 * DELETE /api/student-enrollments/[id]
 * Delete (deactivate) student enrollment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Get existing enrollment
    const existing = await db
      .select()
      .from(studentEnrollments)
      .where(eq(studentEnrollments.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const enrollment = existing[0];

    // Verify school access
    if (isSchoolAdmin(session.user.role) && enrollment.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Cannot delete enrollments from other schools' },
        { status: 403 }
      );
    }

    // Soft delete by setting isActive to false
    await db
      .update(studentEnrollments)
      .set({
        isActive: false,
      })
      .where(eq(studentEnrollments.id, id));

    return NextResponse.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Error deleting student enrollment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

