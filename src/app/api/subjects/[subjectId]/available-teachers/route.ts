import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { getAvailableTeachersForAssignment } from '@/lib/teacher-utils';

/**
 * GET /api/subjects/[subjectId]/available-teachers
 * Get teachers qualified for a subject WITH their capacity information
 * Pre-sorted by available capacity for easy assignment
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subjectId } = await params;
    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    const availableTeachers = await getAvailableTeachersForAssignment(schoolId, subjectId);

    return NextResponse.json({ availableTeachers }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching available teachers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

