import 'server-only';
import { and, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';

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

export const INVITATIONS_PAGE_SIZE = 25;

const pageInput = z.object({
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).catch(1),
  q: z.string().trim().max(254).catch(''),
});

/** Bounded list, with school-wide status totals independent of the search or page. */
export async function getInvitationPage(
  db: Database,
  schoolId: string,
  input: { page?: unknown; q?: unknown } = {},
  now = new Date(),
) {
  const { page: requestedPage, q } = pageInput.parse(input);
  const status = sql<InvitationStatus>`case
    when ${invitations.usedAt} is not null then 'acceptee'
    when ${invitations.expiresAt} > ${now.toISOString()}::timestamptz then 'en_attente'
    else 'expiree'
  end`;
  const totals: Record<InvitationStatus, number> = { en_attente: 0, acceptee: 0, expiree: 0 };
  const counts = await db.select({ status, count: count() }).from(invitations)
    .where(eq(invitations.schoolId, schoolId)).groupBy(sql`1`); // by position, see teacher-home gradeCounts
  for (const row of counts) totals[row.status] = row.count;
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  // Treat SQL wildcard characters as literal email-search input.
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  const where = and(
    eq(invitations.schoolId, schoolId),
    q ? sql`${invitations.email} ilike ${pattern} escape '\\'` : undefined,
  );
  const [matches] = q
    ? await db.select({ count: count() }).from(invitations).where(where)
    : [{ count: total }];
  const pages = Math.max(1, Math.ceil(matches.count / INVITATIONS_PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  // ponytail: offset work grows with page depth; use keyset cursors if measured school lists outgrow this view.
  const rows = await db.select().from(invitations).where(where)
    .orderBy(desc(invitations.createdAt), desc(invitations.id))
    .limit(INVITATIONS_PAGE_SIZE).offset((page - 1) * INVITATIONS_PAGE_SIZE);
  return { rows, totals, total, matched: matches.count, page, pages, q };
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
