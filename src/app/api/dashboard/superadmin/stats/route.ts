import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, classes, subjects, schools, academicLevels } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get system-wide user counts by role
    const userStats = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.role);

    // Get total counts across all schools
    const totalSchools = await db
      .select({ count: sql<number>`count(*)` })
      .from(schools);

    const totalClasses = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes);

    const totalSubjects = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects);

    const totalLevels = await db
      .select({ count: sql<number>`count(*)` })
      .from(academicLevels);

    // Get active vs inactive schools
    const schoolStatus = await db
      .select({
        isActive: schools.isActive,
        count: sql<number>`count(*)`,
      })
      .from(schools)
      .groupBy(schools.isActive);

    // Process stats
    const stats = {
      totalSchools: totalSchools[0]?.count || 0,
      activeSchools: schoolStatus.find(stat => stat.isActive === true)?.count || 0,
      inactiveSchools: schoolStatus.find(stat => stat.isActive === false)?.count || 0,
      totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
      totalAdmins: userStats.find(stat => stat.role === 'admin')?.count || 0,
      totalTeachers: userStats.find(stat => stat.role === 'teacher')?.count || 0,
      totalStudents: userStats.find(stat => stat.role === 'student')?.count || 0,
      totalParents: userStats.find(stat => stat.role === 'parent')?.count || 0,
      totalClasses: totalClasses[0]?.count || 0,
      totalSubjects: totalSubjects[0]?.count || 0,
      totalLevels: totalLevels[0]?.count || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching superadmin dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
