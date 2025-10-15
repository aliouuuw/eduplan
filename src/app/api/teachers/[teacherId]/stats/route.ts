import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin, isTeacher } from '@/lib/auth';
import { getTeacherMetrics } from '@/lib/teacher-utils';

/**
 * GET /api/teachers/[teacherId]/stats
 * Get comprehensive teacher statistics including workload, availability, capacity, and qualifications
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

    const { teacherId } = await params;
    const schoolId = session.user.schoolId;

    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // Teachers can only view their own stats, admins can view any teacher
    if (isTeacher(session.user.role) && session.user.id !== teacherId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isTeacher(session.user.role) && !isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const metrics = await getTeacherMetrics(teacherId, schoolId || '');

    return NextResponse.json(metrics, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching teacher stats:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

