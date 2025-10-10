import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { db, generateId, getCurrentTimestamp } from '@/lib/db';
import { invitations, users } from '@/db/schema';
import { isInvitationValid } from '@/lib/invitations';

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// POST /api/invitations/accept - Accept invitation and create user account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, password } = acceptInvitationSchema.parse(body);

    // Find the invitation
    const invitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { message: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    const invitationData = invitation[0];

    // Check if invitation is valid (not expired, not used)
    if (!isInvitationValid(invitationData)) {
      let reason = 'Invalid invitation';
      
      if (invitationData.usedAt) {
        reason = 'This invitation has already been used';
      } else if (new Date(invitationData.expiresAt) < new Date()) {
        reason = 'This invitation has expired';
      }

      return NextResponse.json(
        { message: reason },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, invitationData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user account
    const userId = generateId();
    const now = getCurrentTimestamp();

    await db.insert(users).values({
      id: userId,
      email: invitationData.email,
      password: hashedPassword,
      name,
      role: invitationData.role,
      schoolId: invitationData.schoolId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Mark invitation as used
    await db
      .update(invitations)
      .set({ usedAt: now })
      .where(eq(invitations.id, invitationData.id));

    return NextResponse.json(
      {
        message: 'Account created successfully',
        userId,
        email: invitationData.email,
        role: invitationData.role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error accepting invitation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

