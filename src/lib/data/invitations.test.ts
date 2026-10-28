import { beforeEach, expect, test } from 'bun:test';

import { invitations, schools } from '@/db/schema';
import type { Database } from '@/lib/db';
import { createInvitation, deleteInvitation, getInvitationPage, invitationStatus } from './invitations';
import { testDb } from './test-db';

let db: Database;
const now = new Date('2026-10-26T10:00:00Z');

beforeEach(async () => {
  db = await testDb();
  for (const id of ['dakar', 'thies']) {
    await db.insert(schools).values({ id, name: id, schoolCode: id.toUpperCase(), createdAt: now, updatedAt: now });
  }
});

test('status: accepted, pending, expired', () => {
  expect(invitationStatus({ usedAt: now, expiresAt: now }, now)).toBe('acceptee');
  expect(invitationStatus({ usedAt: null, expiresAt: new Date('2026-10-30') }, now)).toBe('en_attente');
  expect(invitationStatus({ usedAt: null, expiresAt: new Date('2026-10-01') }, now)).toBe('expiree');
});

test('a still-valid invitation blocks a second one; an expired one does not', async () => {
  const a = await createInvitation(db, { schoolId: 'dakar', email: 'Awa@ecole.sn', role: 'teacher', createdBy: 'u1', now });
  expect(a.ok).toBe(true);
  const dup = await createInvitation(db, { schoolId: 'dakar', email: 'awa@ecole.sn', role: 'teacher', createdBy: 'u1', now });
  expect(dup).toEqual({ ok: false, reason: 'already_pending' });
  const later = new Date('2026-12-01T10:00:00Z'); // after the 7-day expiry of the first one
  expect((await createInvitation(db, { schoolId: 'dakar', email: 'awa@ecole.sn', role: 'teacher', createdBy: 'u1', now: later })).ok).toBe(true);
  expect((await getInvitationPage(db, 'dakar')).rows).toHaveLength(2);
  expect((await getInvitationPage(db, 'thies')).rows).toHaveLength(0);
});

test('delete is scoped to the school and refuses used invitations', async () => {
  await createInvitation(db, { schoolId: 'dakar', email: 'x@ecole.sn', role: 'parent', createdBy: 'u1', now });
  const [inv] = (await getInvitationPage(db, 'dakar')).rows;
  expect(await deleteInvitation(db, { schoolId: 'thies', id: inv.id })).toEqual({ ok: false, reason: 'not_found' });
  await db.update(invitations).set({ usedAt: now });
  expect(await deleteInvitation(db, { schoolId: 'dakar', id: inv.id })).toEqual({ ok: false, reason: 'already_used' });
  await db.update(invitations).set({ usedAt: null });
  expect(await deleteInvitation(db, { schoolId: 'dakar', id: inv.id })).toEqual({ ok: true });
  expect((await getInvitationPage(db, 'dakar')).rows).toHaveLength(0);
});

test('invitation pages stay bounded and stable when timestamps tie; totals span every page', async () => {
  await db.insert(invitations).values(Array.from({ length: 62 }, (_, index) => ({
    id: `inv-${String(index).padStart(3, '0')}`,
    schoolId: index === 61 ? 'thies' : 'dakar',
    email: `teacher${index}@example.test`,
    role: 'teacher' as const,
    token: `token-${index}`,
    createdBy: 'admin',
    createdAt: now,
    expiresAt: index % 3 === 0 ? now : new Date(now.getTime() + 86_400_000),
    usedAt: index % 3 === 1 ? now : null,
  })));
  const first = await getInvitationPage(db, 'dakar', {}, now);
  const second = await getInvitationPage(db, 'dakar', { page: '2' }, now);
  const last = await getInvitationPage(db, 'dakar', { page: '999999' }, now);
  expect(first.rows).toHaveLength(25);
  expect(second.rows).toHaveLength(25);
  expect(last.rows).toHaveLength(11);
  expect(last.page).toBe(3);
  expect(first.total).toBe(61);
  expect(first.totals).toEqual({ expiree: 21, acceptee: 20, en_attente: 20 });
  expect(second.totals).toEqual(first.totals);
  const ids = [...first.rows, ...second.rows, ...last.rows].map((row) => row.id);
  expect(new Set(ids).size).toBe(61);
  expect(ids).not.toContain('inv-061');
  expect((await getInvitationPage(db, 'dakar', { page: '-1' }, now)).page).toBe(1);
  expect((await getInvitationPage(db, 'dakar', { page: ['2', '3'] }, now)).page).toBe(1);
});

test('email search is literal and school-scoped without changing status totals', async () => {
  for (const [index, [schoolId, email]] of [
    ['dakar', 'a_b%@example.test'],
    ['dakar', 'axb12@example.test'],
    ['thies', 'a_b%@example.test'],
  ].entries()) {
    await db.insert(invitations).values({
      id: `search-${index}`, schoolId, email, role: 'parent',
      token: `search-token-${index}`, createdBy: 'admin', createdAt: now, expiresAt: now,
    });
  }
  const match = await getInvitationPage(db, 'dakar', { q: ' _b% ' }, now);
  expect(match.rows.map((row) => row.email)).toEqual(['a_b%@example.test']);
  expect(match.matched).toBe(1);
  expect(match.total).toBe(2);
  expect(match.totals.expiree).toBe(2);
  const empty = await getInvitationPage(db, 'dakar', { q: 'unknown', page: 12 }, now);
  expect(empty.rows).toEqual([]);
  expect(empty.matched).toBe(0);
  expect(empty.page).toBe(1);
  expect(empty.totals).toEqual(match.totals);
  expect((await getInvitationPage(db, 'dakar', { q: 'EXAMPLE.TEST' }, now)).matched).toBe(2);
});
