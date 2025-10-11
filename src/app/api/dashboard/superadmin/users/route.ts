import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, schools } from '@/db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const role = searchParams.get('role');
    const status = searchParams.get('status'); // 'active', 'inactive', or undefined for all

    // Build query conditions
    let conditions = [];

    // School filtering
    if (schoolId) {
      conditions.push(eq(users.schoolId, schoolId));
    }

    // Role filtering
    if (role && ['superadmin', 'admin', 'teacher', 'parent', 'student'].includes(role)) {
      conditions.push(eq(users.role, role as 'superadmin' | 'admin' | 'teacher' | 'parent' | 'student'));
    }

    // Status filtering
    if (status === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(users.isActive, false));
    }

    // Exclude soft-deleted users (deletedAt is not null)
    conditions.push(isNull(users.deletedAt));

    // Get users with school information
    const baseQuery = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        schoolId: users.schoolId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        schoolName: schools.name,
        schoolCode: schools.schoolCode,
      })
      .from(users)
      .leftJoin(schools, eq(users.schoolId, schools.id));

    const allUsers = conditions.length > 0 
      ? await baseQuery.where(and(...conditions)).orderBy(users.createdAt)
      : await baseQuery.orderBy(users.createdAt);

    // Get summary stats (excluding soft-deleted users)
    const stats = await db
      .select({
        role: users.role,
        isActive: users.isActive,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .groupBy(users.role, users.isActive);

    // Process stats
    const totalUsers = stats.reduce((sum, stat) => sum + stat.count, 0);
    const activeUsers = stats.filter(stat => stat.isActive === true).reduce((sum, stat) => sum + stat.count, 0);
    const inactiveUsers = stats.filter(stat => stat.isActive === false).reduce((sum, stat) => sum + stat.count, 0);

    const usersByRole = {
      superadmin: stats.find(stat => stat.role === 'superadmin' && stat.isActive === true)?.count || 0,
      admin: stats.find(stat => stat.role === 'admin' && stat.isActive === true)?.count || 0,
      teacher: stats.find(stat => stat.role === 'teacher' && stat.isActive === true)?.count || 0,
      student: stats.find(stat => stat.role === 'student' && stat.isActive === true)?.count || 0,
      parent: stats.find(stat => stat.role === 'parent' && stat.isActive === true)?.count || 0,
    };

    return NextResponse.json({
      users: allUsers,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
      }
    });
  } catch (error) {
    console.error('Error fetching superadmin users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
