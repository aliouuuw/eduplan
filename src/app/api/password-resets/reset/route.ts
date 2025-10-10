import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { passwordResets, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isPasswordResetValid } from '@/lib/password-resets';
import { hash } from 'bcryptjs';
import { z } from 'zod';

// Schema for resetting password
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * POST /api/password-resets/reset
 * Reset user password with a valid token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Find password reset by token
    const [passwordReset] = await db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.token, validatedData.token))
      .limit(1);

    if (!passwordReset) {
      return NextResponse.json(
        { message: 'Invalid password reset token' },
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
        { message },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(validatedData.newPassword, 10);

    // Update user password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, passwordReset.userId));

    // Mark password reset as used
    await db
      .update(passwordResets)
      .set({
        usedAt: new Date(),
      })
      .where(eq(passwordResets.id, passwordReset.id));

    return NextResponse.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error resetting password:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

