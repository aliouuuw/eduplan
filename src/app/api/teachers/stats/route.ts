import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { getSchoolTeacherMetrics } from '@/lib/teacher-utils';
import { schoolScopeFor } from '@/lib/school-scope';

/**
 * GET /api/teachers/stats?schoolId=xxx
 * Get bulk teacher statistics for all teachers in a school
 * One batched load for the whole school (4 queries), not one load per teacher
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    // A school admin can only read their own school; only a superadmin may pass ?schoolId.
    const schoolId = schoolScopeFor(session.user, searchParams.get('schoolId'));

    if (!schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const validStats = await getSchoolTeacherMetrics(schoolId);

    return NextResponse.json({ teachers: validStats }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching bulk teacher stats:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

