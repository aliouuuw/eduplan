import { connection } from 'next/server';
import { cache } from 'react';

import { profileForAuthUser } from './data/profiles';
import { db } from './db';
import { neonAuth } from './neon-auth';

export type Session = { user: { id: string; name: string; email: string; role: string; schoolId: string | null } };

/** The signed-in EduPlan user, or null. Neon Auth proves who it is (D49); the profile gives role and school. */
export const auth = cache(async (): Promise<Session | null> => {
  // Per-request by nature. Saying so up front stops the build from trying to prerender the page, which
  // the Neon SDK would otherwise log as a cookie error for every route.
  await connection();
  const { data } = await neonAuth.getSession();
  if (!data?.user) return null;
  const user = await profileForAuthUser(db, data.user.id);
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
