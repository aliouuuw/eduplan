import { expect, test } from 'bun:test';

import { posts } from '@/db/schema';
import { testDb } from './test-db';

test('the teaching migration creates posts', async () => {
  const db = await testDb();
  const now = new Date('2026-10-27T12:00:00Z');
  await db.insert(posts).values({
    id: 'p1',
    schoolId: 'dakar',
    classId: 'c1',
    subjectId: 'math',
    authorId: 't1',
    type: 'lesson',
    title: 'Pythagore',
    createdAt: now,
    updatedAt: now,
  });
  expect(await db.select().from(posts)).toHaveLength(1);
});
