import 'server-only';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';

import { invitations } from '@/db/schema';
import type { Database } from '@/lib/db';
import { generateInvitationToken, getDefaultInvitationExpiry } from '@/lib/invitations';
import { generateId } from '@/lib/utils';

export type InvitationRole = (typeof invitations.$inferSelect)['role'];
export type InvitationStatus = 'en_attente' | 'acceptee' | 'expiree';

export function invitationStatus(inv: { usedAt: Date | null; expiresAt: Date }, now = new Date()): InvitationStatus {
  if (inv.usedAt) return 'acceptee';
  return inv.expiresAt > now ? 'en_attente' : 'expiree';
}

/** A school's invitations, newest first. */
export function listInvitations(db: Database, schoolId: string) {
  return db.select().from(invitations).where(eq(invitations.schoolId, schoolId)).orderBy(desc(invitations.createdAt));
}

/** Creates an invitation unless a still-valid one exists for this email (an expired one does not block a new invite). */
export async function createInvitation(
  db: Database,
  input: { schoolId: string; email: string; role: InvitationRole; createdBy: string; now?: Date }
): Promise<{ ok: true; token: string } | { ok: false; reason: 'already_pending' }> {
  const now = input.now ?? new Date();
  const email = input.email.trim().toLowerCase();
  const [pending] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.schoolId, input.schoolId),
        eq(invitations.email, email),
        isNull(invitations.usedAt),
        gt(invitations.expiresAt, now)
      )
    )
    .limit(1);
  if (pending) return { ok: false, reason: 'already_pending' };

  const token = generateInvitationToken();
  await db.insert(invitations).values({
    id: generateId(),
    schoolId: input.schoolId,
    email,
    role: input.role,
    token,
    expiresAt: getDefaultInvitationExpiry(),
    createdBy: input.createdBy,
    usedAt: null,
    createdAt: now,
  });
  return { ok: true, token };
}

/** Deletes an unused invitation of this school. Another school's invitation reads as not found. */
export async function deleteInvitation(
  db: Database,
  input: { schoolId: string; id: string }
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'already_used' }> {
  const [inv] = await db
    .select({ usedAt: invitations.usedAt })
    .from(invitations)
    .where(and(eq(invitations.id, input.id), eq(invitations.schoolId, input.schoolId)))
    .limit(1);
  if (!inv) return { ok: false, reason: 'not_found' };
  if (inv.usedAt) return { ok: false, reason: 'already_used' };
  await db.delete(invitations).where(eq(invitations.id, input.id));
  return { ok: true };
}
