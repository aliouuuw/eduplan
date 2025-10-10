import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { passwordResetRequests, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

// Schema for creating password reset request
const createPasswordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

/**
 * POST /api/password-reset-requests
 * Create a password reset request (public endpoint)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createPasswordResetRequestSchema.parse(body);

    // Check if user exists with this email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    // Create password reset request regardless of whether user exists
    // (for security reasons, don't reveal if email exists or not)
    const requestId = crypto.randomUUID();
    await db.insert(passwordResetRequests).values({
      id: requestId,
      email: validatedData.email,
      userId: user?.id || null,
      status: 'pending',
      approvedBy: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'Password reset request submitted successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error creating password reset request:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/password-reset-requests
 * Get all password reset requests (superadmin only)
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

    // Only superadmin can view password reset requests
    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Only superadmin can view password reset requests' },
        { status: 403 }
      );
    }

    // Get all password reset requests with user information
    const requests = await db
      .select({
        id: passwordResetRequests.id,
        email: passwordResetRequests.email,
        userId: passwordResetRequests.userId,
        status: passwordResetRequests.status,
        approvedBy: passwordResetRequests.approvedBy,
        notes: passwordResetRequests.notes,
        createdAt: passwordResetRequests.createdAt,
        updatedAt: passwordResetRequests.updatedAt,
        userName: users.name,
        userRole: users.role,
        userIsActive: users.isActive,
      })
      .from(passwordResetRequests)
      .leftJoin(users, eq(passwordResetRequests.userId, users.id))
      .orderBy(desc(passwordResetRequests.createdAt));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching password reset requests:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

