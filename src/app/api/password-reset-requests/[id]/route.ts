import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { passwordResetRequests, passwordResets, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generatePasswordResetToken, getDefaultPasswordResetExpiry, getPasswordResetLink } from '@/lib/password-resets';

// Schema for updating password reset request
const updatePasswordResetRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
});

/**
 * PUT /api/password-reset-requests/[id]
 * Approve or reject a password reset request (superadmin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin can approve/reject password reset requests
    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Only superadmin can approve or reject password reset requests' },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;
    const body = await req.json();
    const validatedData = updatePasswordResetRequestSchema.parse(body);

    // Find the password reset request
    const [request] = await db
      .select()
      .from(passwordResetRequests)
      .where(eq(passwordResetRequests.id, requestId))
      .limit(1);

    if (!request) {
      return NextResponse.json(
        { message: 'Password reset request not found' },
        { status: 404 }
      );
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return NextResponse.json(
        { message: 'Password reset request has already been processed' },
        { status: 400 }
      );
    }

    // Check if user exists
    if (!request.userId) {
      return NextResponse.json(
        { message: 'User not found with this email address' },
        { status: 404 }
      );
    }

    let resetLink: string | null = null;

    if (validatedData.action === 'approve') {
      // Generate password reset token
      const token = generatePasswordResetToken();
      const expiresAt = getDefaultPasswordResetExpiry();

      // Create password reset record
      const resetId = crypto.randomUUID();
      await db.insert(passwordResets).values({
        id: resetId,
        userId: request.userId,
        email: request.email,
        token,
        expiresAt,
        createdBy: session.user.id,
        usedAt: null,
        createdAt: new Date(),
      });

      resetLink = getPasswordResetLink(token);

      // Update request status to approved
      await db
        .update(passwordResetRequests)
        .set({
          status: 'approved',
          approvedBy: session.user.id,
          notes: validatedData.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(passwordResetRequests.id, requestId));

      return NextResponse.json({
        message: 'Password reset request approved and reset link generated',
        resetLink,
      });
    } else {
      // Reject the request
      await db
        .update(passwordResetRequests)
        .set({
          status: 'rejected',
          approvedBy: session.user.id,
          notes: validatedData.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(passwordResetRequests.id, requestId));

      return NextResponse.json({
        message: 'Password reset request rejected',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error updating password reset request:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/password-reset-requests/[id]
 * Delete a password reset request (superadmin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin can delete password reset requests
    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Only superadmin can delete password reset requests' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const requestId = id;

    // Delete the request
    await db
      .delete(passwordResetRequests)
      .where(eq(passwordResetRequests.id, requestId));

    return NextResponse.json({
      message: 'Password reset request deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting password reset request:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

