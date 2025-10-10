import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, classes, subjects, academicLevels } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 });
    }

    // Get user counts by role
    const userStats = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(eq(users.schoolId, schoolId))
      .groupBy(users.role);

    // Get total counts
    const totalClasses = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(eq(classes.schoolId, schoolId));

    const totalSubjects = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(eq(subjects.schoolId, schoolId));

    const totalLevels = await db
      .select({ count: sql<number>`count(*)` })
      .from(academicLevels)
      .where(eq(academicLevels.schoolId, schoolId));

    // Process user stats
    const stats = {
      totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
      totalTeachers: userStats.find(stat => stat.role === 'teacher')?.count || 0,
      totalStudents: userStats.find(stat => stat.role === 'student')?.count || 0,
      totalParents: userStats.find(stat => stat.role === 'parent')?.count || 0,
      totalClasses: totalClasses[0]?.count || 0,
      totalSubjects: totalSubjects[0]?.count || 0,
      totalLevels: totalLevels[0]?.count || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
