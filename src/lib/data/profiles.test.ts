import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import { users } from '@/db/schema';

import { profileForAuthUser } from './profiles';
import { testDb } from './test-db';

const NOW = new Date('2026-10-29T10:00:00Z');
const base = { email: 'prof@ecole.sn', name: 'Prof', role: 'teacher' as const, schoolId: 's1', isActive: true, createdAt: NOW, updatedAt: NOW };

test('a login opens the profile linked by auth_user_id, and only an active one', async () => {
  const db = await testDb();
  await db.insert(users).values({ ...base, id: 'u1', authUserId: 'login-1' });
  expect((await profileForAuthUser(db, 'login-1'))?.id).toBe('u1');

  // A second login with the same email (someone signed up with it) opens nothing.
  expect(await profileForAuthUser(db, 'login-2')).toBeNull();

  await db.update(users).set({ isActive: false }).where(eq(users.id, 'u1'));
  expect(await profileForAuthUser(db, 'login-1')).toBeNull();
  await db.update(users).set({ isActive: true, deletedAt: NOW }).where(eq(users.id, 'u1'));
  expect(await profileForAuthUser(db, 'login-1')).toBeNull();
});
