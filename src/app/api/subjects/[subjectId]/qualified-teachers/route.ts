import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { getQualifiedTeachers } from '@/lib/assignment-validation';
import { getWorkloadByTeacher } from '@/lib/teacher-utils';

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
    const teacherIds = qualifiedTeachers.map((teacher) => teacher.id);

    const workloadByTeacher = schoolId
      ? await getWorkloadByTeacher(schoolId, teacherIds)
      : new Map<string, { hours: number; count: number }>();

    return NextResponse.json({
      qualifiedTeachers: qualifiedTeachers.map((teacher) => {
        const workload = workloadByTeacher.get(teacher.id);
        return {
          ...teacher,
          workload: workload?.hours ?? 0,
          assignmentCount: workload?.count ?? 0,
        };
      }),
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching qualified teachers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

