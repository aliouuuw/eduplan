import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { calculateTeacherWorkload } from '@/lib/assignment-validation';

/**
 * GET /api/teachers/[teacherId]/workload
 * Calculate and return teacher's total workload
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role) && session.user.id !== (await params).teacherId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { teacherId } = await params;
    const schoolId = session.user.schoolId;

    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    const workload = await calculateTeacherWorkload(teacherId, schoolId || '');

    return NextResponse.json(workload, { status: 200 });
  } catch (error: any) {
    console.error('Error calculating teacher workload:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

