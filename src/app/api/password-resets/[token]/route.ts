import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { passwordResets, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isPasswordResetValid } from '@/lib/password-resets';

/**
 * GET /api/password-resets/[token]
 * Verify if a password reset token is valid
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    // Find password reset by token
    const [passwordReset] = await db
      .select({
        id: passwordResets.id,
        email: passwordResets.email,
        userId: passwordResets.userId,
        expiresAt: passwordResets.expiresAt,
        usedAt: passwordResets.usedAt,
        userName: users.name,
        userRole: users.role,
      })
      .from(passwordResets)
      .leftJoin(users, eq(passwordResets.userId, users.id))
      .where(eq(passwordResets.token, token))
      .limit(1);

    if (!passwordReset) {
      return NextResponse.json(
        { valid: false, message: 'Invalid password reset token' },
        { status: 404 }
      );
    }

    // Check if password reset is valid
    const valid = isPasswordResetValid({
      expiresAt: passwordReset.expiresAt,
      usedAt: passwordReset.usedAt,
    });

    if (!valid) {
      const message = passwordReset.usedAt
        ? 'This password reset link has already been used'
        : 'This password reset link has expired';
      
      return NextResponse.json(
        { valid: false, message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      passwordReset: {
        email: passwordReset.email,
        userName: passwordReset.userName,
        userRole: passwordReset.userRole,
        expiresAt: passwordReset.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error verifying password reset:', error);
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

