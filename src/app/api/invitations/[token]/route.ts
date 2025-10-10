import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invitations, schools } from '@/db/schema';
import { isInvitationValid } from '@/lib/invitations';

// GET /api/invitations/[token] - Verify and get invitation details (public route)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { message: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        schoolId: invitations.schoolId,
        expiresAt: invitations.expiresAt,
        usedAt: invitations.usedAt,
        schoolName: schools.name,
        schoolCode: schools.schoolCode,
      })
      .from(invitations)
      .leftJoin(schools, eq(invitations.schoolId, schools.id))
      .where(eq(invitations.token, token))
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { message: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    const invitationData = invitation[0];

    // Check if invitation is valid
    if (!isInvitationValid(invitationData)) {
      let reason = 'Invalid invitation';
      
      if (invitationData.usedAt) {
        reason = 'This invitation has already been used';
      } else if (new Date(invitationData.expiresAt) < new Date()) {
        reason = 'This invitation has expired';
      }

      return NextResponse.json(
        { message: reason, valid: false },
        { status: 400 }
      );
    }

    // Return invitation details (without sensitive info)
    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitationData.email,
        role: invitationData.role,
        schoolName: invitationData.schoolName,
        schoolCode: invitationData.schoolCode,
        expiresAt: invitationData.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

