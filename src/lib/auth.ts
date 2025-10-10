import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from '../db/schema';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate input
          const { email, password } = loginSchema.parse(credentials);

          // Find user in database
          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user.length) {
            return null;
          }

          const foundUser = user[0];

          // Check if user is active
          if (!foundUser.isActive) {
            return null;
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, foundUser.password);
          if (!isValidPassword) {
            return null;
          }

          // Return user object for session
          return {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role,
            schoolId: foundUser.schoolId,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user info to JWT token
      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user info to session
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.schoolId = token.schoolId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
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
