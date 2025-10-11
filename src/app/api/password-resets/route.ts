import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { passwordResets, users } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { generatePasswordResetToken, getDefaultPasswordResetExpiry, getPasswordResetLink } from '@/lib/password-resets';
import { z } from 'zod';

// Schema for creating password reset
const createPasswordResetSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * POST /api/password-resets
 * Create a password reset link for a user (superadmin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin can create password reset links
    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Only superadmin can create password reset links' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = createPasswordResetSchema.parse(body);

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'User account is not active' },
        { status: 400 }
      );
    }

    // Generate password reset token
    const token = generatePasswordResetToken();
    const expiresAt = getDefaultPasswordResetExpiry();

    // Create password reset record
    const resetId = crypto.randomUUID();
    await db.insert(passwordResets).values({
      id: resetId,
      userId: user.id,
      email: user.email,
      token,
      expiresAt,
      createdBy: session.user.id,
      usedAt: null,
      createdAt: new Date(),
    });

    const resetLink = getPasswordResetLink(token);

    return NextResponse.json({
      message: 'Password reset link created successfully',
      passwordReset: {
        id: resetId,
        email: user.email,
        userName: user.name,
        resetLink,
        expiresAt: expiresAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error creating password reset:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/password-resets
 * Get all password resets (superadmin only)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin can view all password resets
    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Only superadmin can view password resets' },
        { status: 403 }
      );
    }

    // Get all password resets with user information
    const resets = await db
      .select({
        id: passwordResets.id,
        email: passwordResets.email,
        token: passwordResets.token,
        expiresAt: passwordResets.expiresAt,
        usedAt: passwordResets.usedAt,
        createdAt: passwordResets.createdAt,
        userId: passwordResets.userId,
        userName: users.name,
        userRole: users.role,
      })
      .from(passwordResets)
      .leftJoin(users, eq(passwordResets.userId, users.id))
      .orderBy(desc(passwordResets.createdAt));

    return NextResponse.json({ passwordResets: resets });
  } catch (error) {
    console.error('Error fetching password resets:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

