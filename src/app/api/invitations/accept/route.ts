import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db, getCurrentTimestamp } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { invitations, users } from '@/db/schema';
import { isInvitationValid } from '@/lib/invitations';
import { neonAuth } from '@/lib/neon-auth';

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

    // A profile an admin created earlier (no login yet) is linked, not refused.
    const [existing] = await db
      .select({ id: users.id, authUserId: users.authUserId, schoolId: users.schoolId })
      .from(users)
      .where(eq(users.email, invitationData.email))
      .limit(1);
    if (existing?.authUserId) {
      return NextResponse.json({ message: 'This email already has an EduPlan account. Sign in instead.' }, { status: 400 });
    }
    if (existing && existing.schoolId !== invitationData.schoolId) {
      // One school per profile until memberships exist (D45).
      return NextResponse.json({ message: 'This email belongs to another school.' }, { status: 400 });
    }

    // Neon Auth holds the login and signs the person in (D49); our row holds the role and school.
    let login = await neonAuth.signUp.email({ email: invitationData.email, name, password });
    let loginExisted = false;
    if (login.error) {
      // Usually a login without a profile: an earlier accept that failed halfway, or someone who signed up
      // with this email first. Only its password opens it; the reset email proves the inbox otherwise.
      // (The SDK folds Better Auth's codes into "validation_failed", so the message is the only signal.)
      const signIn = await neonAuth.signIn.email({ email: invitationData.email, password });
      if (signIn.error) {
        const taken = /already/i.test(login.error.message ?? '');
        return NextResponse.json(
          { message: taken ? 'This email already has a login with another password. Use "Forgot password", then open this link again.' : login.error.message ?? 'Sign-up failed.' },
          { status: taken ? 409 : 400 }
        );
      }
      login = signIn;
      loginExisted = true;
    }
    if (!login.data) {
      return NextResponse.json({ message: 'Sign-up failed. Please try again.' }, { status: 502 });
    }
    const authUserId = login.data.user.id;
    const sessionToken = login.data.token ?? ''; // sign-in always returns one; it is only read when the login existed

    const userId = existing?.id ?? generateId();
    const now = getCurrentTimestamp();
    const used = await db.transaction(async (tx) => {
      // The usedAt guard makes a second accept of the same invitation a no-op.
      const claimed = await tx
        .update(invitations)
        .set({ usedAt: now })
        .where(and(eq(invitations.id, invitationData.id), isNull(invitations.usedAt)))
        .returning({ id: invitations.id });
      if (claimed.length === 0) return false;
      if (existing) {
        const linked = await tx
          .update(users)
          .set({ authUserId, name, role: invitationData.role, isActive: true, updatedAt: now })
          .where(and(eq(users.id, existing.id), isNull(users.authUserId)))
          .returning({ id: users.id });
        if (linked.length === 0) throw new Error('profile linked concurrently');
      } else {
        await tx.insert(users).values({
          id: userId,
          authUserId,
          email: invitationData.email,
          name,
          role: invitationData.role,
          schoolId: invitationData.schoolId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (loginExisted) {
        // Whoever else holds a session on that login must not inherit the profile.
        // ponytail: writes Better Auth's own session table (the SDK revoke cannot see this request's new
        // cookie). A cached session cookie stays readable for up to 5 minutes (sessionDataTtl).
        await tx.execute(sql`delete from neon_auth.session where "userId"::text = ${authUserId} and token <> ${sessionToken}`);
      }
      return true;
    });
    if (!used) {
      return NextResponse.json({ message: 'This invitation has already been used' }, { status: 400 });
    }

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

