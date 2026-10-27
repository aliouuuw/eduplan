import { beforeEach, expect, test } from 'bun:test';

import { invitations, schools } from '@/db/schema';
import type { Database } from '@/lib/db';
import { createInvitation, deleteInvitation, invitationStatus, listInvitations } from './invitations';
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
  expect(await listInvitations(db, 'dakar')).toHaveLength(2);
  expect(await listInvitations(db, 'thies')).toHaveLength(0);
});

test('delete is scoped to the school and refuses used invitations', async () => {
  await createInvitation(db, { schoolId: 'dakar', email: 'x@ecole.sn', role: 'parent', createdBy: 'u1', now });
  const [inv] = await listInvitations(db, 'dakar');
  expect(await deleteInvitation(db, { schoolId: 'thies', id: inv.id })).toEqual({ ok: false, reason: 'not_found' });
  await db.update(invitations).set({ usedAt: now });
  expect(await deleteInvitation(db, { schoolId: 'dakar', id: inv.id })).toEqual({ ok: false, reason: 'already_used' });
  await db.update(invitations).set({ usedAt: null });
  expect(await deleteInvitation(db, { schoolId: 'dakar', id: inv.id })).toEqual({ ok: true });
  expect(await listInvitations(db, 'dakar')).toHaveLength(0);
});
