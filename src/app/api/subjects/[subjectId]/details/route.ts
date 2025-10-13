import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  subjects,
  teacherClasses,
  classes,
  users,
  teacherSubjects
} from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';

/**
 * GET /api/subjects/[subjectId]/details
 * Get comprehensive subject details including classes and teachers
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ subjectId: string }> }) {
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

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    // Get subject details
    const whereConditions = [eq(subjects.id, subjectId)];
    if (schoolId) {
      whereConditions.push(eq(subjects.schoolId, schoolId));
    }

    const subjectData = await db.select().from(subjects).where(
      and(...whereConditions)
    ).limit(1);

    if (subjectData.length === 0) {
      return NextResponse.json({ error: 'Subject not found or not authorized' }, { status: 404 });
    }

    const subject = subjectData[0];

    // Get classes using this subject with enrollment counts
    const classWhereConditions = [eq(teacherClasses.subjectId, subjectId)];
    if (schoolId) {
      classWhereConditions.push(eq(teacherClasses.schoolId, schoolId));
    }

    const classesData = await db.select({
      id: classes.id,
      name: classes.name,
      academicYear: classes.academicYear,
      capacity: classes.capacity,
      weeklyHours: teacherClasses.weeklyHours,
      // Aggregate student count for each class
      studentCount: count(teacherClasses.id) // This will be replaced with proper enrollment count
    })
    .from(classes)
    .innerJoin(teacherClasses, eq(classes.id, teacherClasses.classId))
    .where(and(...classWhereConditions))
    .groupBy(classes.id, classes.name, classes.academicYear, classes.capacity, teacherClasses.weeklyHours);

    // Get teachers who teach this subject with their class assignments
    const teacherWhereConditions = [eq(teacherClasses.subjectId, subjectId)];
    if (schoolId) {
      teacherWhereConditions.push(eq(teacherClasses.schoolId, schoolId));
    }

    const teachersData = await db.select({
      teacherId: users.id,
      teacherName: users.name,
      teacherEmail: users.email,
      classId: classes.id,
      className: classes.name,
      weeklyHours: teacherClasses.weeklyHours,
      academicYear: classes.academicYear,
    })
    .from(teacherClasses)
    .innerJoin(users, eq(teacherClasses.teacherId, users.id))
    .innerJoin(classes, eq(teacherClasses.classId, classes.id))
    .where(and(...teacherWhereConditions));

    // Group teachers with their classes
    const teachersWithClasses = teachersData.reduce((acc: any, item) => {
      if (!acc[item.teacherId]) {
        acc[item.teacherId] = {
          id: item.teacherId,
          name: item.teacherName,
          email: item.teacherEmail,
          classes: []
        };
      }
      acc[item.teacherId].classes.push({
        id: item.classId,
        name: item.className,
        weeklyHours: item.weeklyHours,
        academicYear: item.academicYear,
      });
      return acc;
    }, {});

    // Calculate statistics
    const totalClasses = classesData.length;
    const totalTeachers = Object.keys(teachersWithClasses).length;
    const totalCapacity = classesData.reduce((sum, cls) => sum + cls.capacity, 0);

    return NextResponse.json({
      subject,
      classes: classesData,
      teachers: Object.values(teachersWithClasses),
      statistics: {
        totalClasses,
        totalTeachers,
        totalCapacity,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching subject details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
