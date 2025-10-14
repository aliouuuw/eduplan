import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { getQualifiedTeachers } from '@/lib/assignment-validation';

/**
 * GET /api/subjects/[subjectId]/qualified-teachers
 * Get all teachers qualified to teach a specific subject
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { subjectId } = await params;
    const schoolId = session.user.schoolId;

    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    const qualifiedTeachers = await getQualifiedTeachers(subjectId, schoolId || '');

    return NextResponse.json({ qualifiedTeachers }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching qualified teachers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

