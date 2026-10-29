import { cache } from 'react';
import { and, eq, isNull } from 'drizzle-orm';

import { users } from '../db/schema';
import { db } from './db';
import { neonAuth } from './neon-auth';

export type Session = { user: { id: string; name: string; email: string; role: string; schoolId: string | null } };

/**
 * The signed-in EduPlan user, or null. Neon Auth proves who it is (D49); our users row gives the role and
 * school. The row is matched on auth_user_id, never on email: anyone can sign up with an email that has
 * a profile, so an email match would hand them that account. Inactive and soft-deleted users get null.
 */
export const auth = cache(async (): Promise<Session | null> => {
  const { data } = await neonAuth.getSession();
  if (!data?.user) return null;
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, schoolId: users.schoolId })
    .from(users)
    .where(and(eq(users.authUserId, data.user.id), eq(users.isActive, true), isNull(users.deletedAt)))
    .limit(1);
  return user ? { user } : null;
});
// Utility functions for role checking
export function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    superadmin: 5,
    admin: 4,
    teacher: 3,
    parent: 3,
    student: 1,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

export function canAccessSchool(userRole: string, userSchoolId: string | null, targetSchoolId: string): boolean {
  // Superadmin can access any school
  if (userRole === 'superadmin') {
    return true;
  }

  // Other roles can only access their own school
  return userSchoolId === targetSchoolId;
}

export function isSuperAdmin(userRole: string): boolean {
  return userRole === 'superadmin';
}

export function isSchoolAdmin(userRole: string): boolean {
  return userRole === 'admin';
}

export function isTeacher(userRole: string): boolean {
  return userRole === 'teacher';
}

export function isParent(userRole: string): boolean {
  return userRole === 'parent';
}

export function isStudent(userRole: string): boolean {
  return userRole === 'student';
}
