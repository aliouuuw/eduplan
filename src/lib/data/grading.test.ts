import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import { grades, posts, submissions, teacherClasses, terms } from '@/db/schema';

import { seedDemo } from './demo-seed';
import { getCorrection, gradeSubmission, listTermWork, parseGrade } from './grading';
import { testDb } from './test-db';

const DAY = '2026-10-27';
const base = { teacherId: 'demo-aissatou', schoolId: 'demo-dakar', comment: '' };

test('grades accept a French decimal comma and quarter points within the scale', () => {
  expect(parseGrade('11,5', 20)).toBe(11.5);
  expect(parseGrade(' 18.25 ', 20)).toBe(18.25);
  expect(parseGrade('20', 20)).toBe(20);
  expect(parseGrade('0', 20)).toBe(0);
  for (const bad of ['21', '-1', '11,3', 'abc', '', '1e1']) expect(parseGrade(bad, 20)).toBeNull();
  expect(parseGrade('10', 10)).toBe(10);
  expect(parseGrade('11', 10)).toBeNull();
});

test('the term list counts copies by state for the taught courses only', async () => {
  const db = await testDb();
  await seedDemo(db);
  const { works, context } = await listTermWork(db, 'demo-aissatou', 'demo-dakar', { day: DAY });
  expect(context.term?.id).toBe('demo-t1');
  const dm3 = works.find((w) => w.id === 'demo-dm3');
  expect(dm3).toMatchObject({ toGrade: 22, missing: 6, graded: 0, total: 28 });
  expect(works.map((w) => w.id).sort()).toEqual(['demo-dm3', 'demo-pyth']);

  // Without the course assignment, the work disappears even for its author.
  await db.delete(teacherClasses).where(eq(teacherClasses.classId, 'demo-4a'));
  const after = await listTermWork(db, 'demo-aissatou', 'demo-dakar', { day: DAY });
  expect(after.works.map((w) => w.id)).toEqual(['demo-pyth']);
});

test('grading stores /20 in the work term, returns the copy, and a second save updates it', async () => {
  const db = await testDb();
  await seedDemo(db);
  await db.update(posts).set({ maxGrade: 10, coefficient: 2 }).where(eq(posts.id, 'demo-dm3'));
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '7,5', comment: ' Bien ' })).toEqual({ ok: true });
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '8' })).toEqual({ ok: true });

  const rows = await db.select().from(grades).where(eq(grades.submissionId, 'sub-dm3-0'));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ value: 16, coefficient: 2, termId: 'demo-t1', classId: 'demo-4a', comment: null });
  const [copy] = await db.select().from(submissions).where(eq(submissions.id, 'sub-dm3-0'));
  expect(copy.status).toBe('returned');

  const view = await getCorrection(db, 'demo-aissatou', 'demo-dakar', 'demo-dm3');
  expect(view?.copies.find((c) => c.id === 'sub-dm3-0')?.grade).toBe(8); // back on the work's /10 scale
});

test('grading refuses a closed term, an invalid grade, another course, and another school', async () => {
  const db = await testDb();
  await seedDemo(db);
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '25' })).toEqual({ ok: false, reason: 'invalid_grade' });
  expect(await gradeSubmission(db, { ...base, schoolId: 'other-school', submissionId: 'sub-dm3-0', grade: '12' })).toEqual({ ok: false, reason: 'not_found' });
  expect(await gradeSubmission(db, { ...base, teacherId: 'someone-else', submissionId: 'sub-dm3-0', grade: '12' })).toEqual({ ok: false, reason: 'not_found' });

  await db.update(terms).set({ closedAt: new Date() }).where(eq(terms.id, 'demo-t1'));
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '12' })).toEqual({ ok: false, reason: 'closed' });
  expect((await getCorrection(db, 'demo-aissatou', 'demo-dakar', 'demo-dm3'))?.editable).toBe(false);

  await db.update(posts).set({ dueAt: new Date('2027-08-01T00:00:00Z') }).where(eq(posts.id, 'demo-dm3'));
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '12' })).toEqual({ ok: false, reason: 'no_term' });
  expect(await db.select().from(grades).where(eq(grades.submissionId, 'sub-dm3-0'))).toHaveLength(0);
});
