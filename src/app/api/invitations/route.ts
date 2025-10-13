import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db, getCurrentTimestamp } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { invitations, schools } from '@/db/schema';
import {
  generateInvitationToken,
  getDefaultInvitationExpiry,
  getInvitationLink,
} from '@/lib/invitations';

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'teacher', 'parent', 'student']),
  schoolId: z.string().optional(), // Optional - if not provided, uses session schoolId
});

// POST /api/invitations - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Only superadmin and school admins can create invitations
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role, schoolId: requestedSchoolId } = createInvitationSchema.parse(body);

    // Determine which schoolId to use
    let targetSchoolId: string;

    if (isSuperAdmin(session.user.role)) {
      // Superadmin must specify schoolId
      if (!requestedSchoolId) {
        return NextResponse.json(
          { message: 'schoolId is required for superadmin' },
          { status: 400 }
        );
      }
      targetSchoolId = requestedSchoolId;

      // Verify school exists
      const school = await db
        .select()
        .from(schools)
        .where(eq(schools.id, targetSchoolId))
        .limit(1);

      if (school.length === 0) {
        return NextResponse.json(
          { message: 'School not found' },
          { status: 404 }
        );
      }
    } else {
      // School admin uses their own schoolId
      if (!session.user.schoolId) {
        return NextResponse.json(
          { message: 'User is not associated with a school' },
          { status: 400 }
        );
      }
      targetSchoolId = session.user.schoolId;
    }

    // Check if there's already a pending invitation for this email and school
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.schoolId, targetSchoolId),
          isNull(invitations.usedAt)
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return NextResponse.json(
        { message: 'An active invitation already exists for this email' },
        { status: 400 }
      );
    }

    // Create the invitation
    const invitationId = generateId();
    const token = generateInvitationToken();
    const expiresAt = getDefaultInvitationExpiry();
    const now = getCurrentTimestamp();

    await db.insert(invitations).values({
      id: invitationId,
      schoolId: targetSchoolId,
      email,
      role,
      token,
      expiresAt,
      createdBy: session.user.id,
      usedAt: null,
      createdAt: now,
    });

    const invitationLink = getInvitationLink(token);

    return NextResponse.json(
      {
        message: 'Invitation created successfully',
        invitation: {
          id: invitationId,
          email,
          role,
          invitationLink,
          expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invitation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/invitations - List invitations for the user's school
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Only superadmin and school admins can view invitations
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    let allInvitations;

    if (isSuperAdmin(session.user.role)) {
      // Superadmin sees all invitations
      allInvitations = await db
        .select()
        .from(invitations)
        .orderBy(invitations.createdAt);
    } else {
      // School admin sees only their school's invitations
      if (!session.user.schoolId) {
        return NextResponse.json(
          { message: 'User is not associated with a school' },
          { status: 400 }
        );
      }

      allInvitations = await db
        .select()
        .from(invitations)
        .where(eq(invitations.schoolId, session.user.schoolId))
        .orderBy(invitations.createdAt);
    }

    return NextResponse.json({ invitations: allInvitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/invitations?id=xxx - Delete/revoke an invitation
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Only superadmin and school admins can delete invitations
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { message: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Get the invitation to check permissions
    const invitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { message: 'Invitation not found' },
        { status: 404 }
      );
    }

    const invitationData = invitation[0];

    // Check if user has permission to delete this invitation
    if (!isSuperAdmin(session.user.role)) {
      if (invitationData.schoolId !== session.user.schoolId) {
        return NextResponse.json(
          { message: 'Unauthorized - Cannot delete invitations from other schools' },
          { status: 403 }
        );
      }
    }

    // Don't allow deletion of already used invitations
    if (invitationData.usedAt) {
      return NextResponse.json(
        { message: 'Cannot delete an invitation that has already been used' },
        { status: 400 }
      );
    }

    // Delete the invitation
    await db.delete(invitations).where(eq(invitations.id, invitationId));

    return NextResponse.json(
      { message: 'Invitation deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

