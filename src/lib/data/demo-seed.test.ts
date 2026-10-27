import { eq } from 'drizzle-orm';
import { expect, test } from 'bun:test';

import { grades, notionCoverage, studentEnrollments, studentFlags, submissions } from '@/db/schema';
import { DEMO_SCHOOL_ID, seedDemo } from './demo-seed';
import { testDb } from './test-db';

test('demo seed matches the teacher-home mock counts', async () => {
  const db = await testDb();
  await seedDemo(db);

  const enrolled = await db.select().from(studentEnrollments).where(eq(studentEnrollments.classId, 'demo-3b'));
  expect(enrolled).toHaveLength(31);

  const flags = await db.select().from(studentFlags).where(eq(studentFlags.schoolId, DEMO_SCHOOL_ID));
  expect(flags).toHaveLength(4);

  const covered4a = await db.select().from(notionCoverage).where(eq(notionCoverage.classId, 'demo-4a'));
  const covered4b = await db.select().from(notionCoverage).where(eq(notionCoverage.classId, 'demo-4b'));
  const covered3b = await db.select().from(notionCoverage).where(eq(notionCoverage.classId, 'demo-3b'));
  expect(covered4a).toHaveLength(13);
  expect(covered4b).toHaveLength(10);
  expect(covered3b).toHaveLength(11);

  const copies = await db.select().from(submissions).where(eq(submissions.postId, 'demo-dm3'));
  const toGrade = copies.filter((row) => row.status === 'submitted' || row.status === 'late');
  expect(copies).toHaveLength(28);
  expect(toGrade).toHaveLength(22);

  const entered = await db.select().from(grades).where(eq(grades.schoolId, DEMO_SCHOOL_ID));
  expect(entered).toHaveLength(9);
});
