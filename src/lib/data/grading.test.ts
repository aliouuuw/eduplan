import { expect, test } from 'bun:test';
import { and, eq, isNull, ne } from 'drizzle-orm';

import { academicYears, grades, posts, submissions, teacherClasses, terms } from '@/db/schema';

import { seedDemo } from './demo-seed';
import { averageBands, fromTwenty, getCorrection, getGradebook, gradeSubmission, listTermWork, meanOf, parseGrade, syncWorkGrades, toTwenty, weightedAverage } from './grading';
import { schoolDayStart } from './teacher-home-math';
import { getTeacherHome } from './teacher-home';
import { testDb } from './test-db';

const DAY = '2026-10-27';
const NOW = new Date(`${DAY}T10:00:00Z`);
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
  const { works, context } = await listTermWork(db, 'demo-aissatou', 'demo-dakar', { now: NOW });
  expect(context.term?.id).toBe('demo-t1');
  const dm3 = works.find((w) => w.id === 'demo-dm3');
  expect(dm3).toMatchObject({ toGrade: 22, missing: 6, graded: 0, total: 28 });
  expect(works.map((w) => w.id).sort()).toEqual(['demo-dm3', 'demo-pyth']);

  // Without the course assignment, the work disappears even for its author.
  await db.delete(teacherClasses).where(eq(teacherClasses.classId, 'demo-4a'));
  const after = await listTermWork(db, 'demo-aissatou', 'demo-dakar', { now: NOW });
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

  expect(await db.select().from(grades).where(eq(grades.submissionId, 'sub-dm3-0'))).toHaveLength(0);

  // A trimestre left open in a past year is read-only too, and says so.
  await db.update(terms).set({ closedAt: null }).where(eq(terms.id, 'demo-t1'));
  await db.update(academicYears).set({ isCurrent: false });
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '12' })).toEqual({ ok: false, reason: 'past_year' });
  expect((await getCorrection(db, 'demo-aissatou', 'demo-dakar', 'demo-dm3'))?.lock).toBe('past_year');
});

test('two saves of the same copy at once leave one grade', async () => {
  const db = await testDb();
  await seedDemo(db);
  const results = await Promise.all(['12', '13'].map((grade) => gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade })));
  expect(results).toEqual([{ ok: true }, { ok: true }]);
  expect(await db.select().from(grades).where(eq(grades.submissionId, 'sub-dm3-0'))).toHaveLength(1);
});

test('work due in a holiday gap counts in the next trimestre, on the list and in the grade', async () => {
  const db = await testDb();
  await seedDemo(db);
  const [t1] = await db.select().from(terms).where(eq(terms.id, 'demo-t1'));
  await db.insert(terms).values({ ...t1, id: 'demo-t2', name: 'Trimestre 2', position: 2, startsOn: '2026-12-07', endsOn: '2027-03-14' });
  await db.update(posts).set({ dueAt: new Date('2026-12-02T12:00:00Z') }).where(eq(posts.id, 'demo-dm3')); // T1 ends 29 Nov

  const ids = async (termId: string) => (await listTermWork(db, 'demo-aissatou', 'demo-dakar', { now: NOW, termId })).works.map((w) => w.id);
  expect(await ids('demo-t1')).not.toContain('demo-dm3');
  expect(await ids('demo-t2')).toContain('demo-dm3');
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '12' })).toEqual({ ok: true });
  const [row] = await db.select().from(grades).where(eq(grades.submissionId, 'sub-dm3-0'));
  expect(row.termId).toBe('demo-t2');
});

test('grades follow a later change of the work date or coefficient', async () => {
  const db = await testDb();
  await seedDemo(db);
  const [t1] = await db.select().from(terms).where(eq(terms.id, 'demo-t1'));
  await db.insert(terms).values({ ...t1, id: 'demo-t2', name: 'Trimestre 2', position: 2, startsOn: '2026-12-07', endsOn: '2027-03-14' });
  await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '12' });
  await db.update(posts).set({ coefficient: 3, dueAt: new Date('2027-01-15T12:00:00Z') }).where(eq(posts.id, 'demo-dm3'));
  await syncWorkGrades(db, 'demo-dakar', 'demo-dm3');
  const [row] = await db.select().from(grades).where(eq(grades.submissionId, 'sub-dm3-0'));
  expect(row).toMatchObject({ coefficient: 3, termId: 'demo-t2' });
  await syncWorkGrades(db, 'other-school', 'demo-dm3'); // another school's id changes nothing
});

test('the home and the Notes list count the same copies, for every teacher of the course', async () => {
  const db = await testDb();
  await seedDemo(db);
  const [assignment] = await db.select().from(teacherClasses).where(eq(teacherClasses.classId, 'demo-4a'));
  await db.insert(teacherClasses).values({ ...assignment, id: 'co-teacher', teacherId: 'co-teacher' });
  for (const teacher of ['demo-aissatou', 'co-teacher']) {
    const home = await getTeacherHome(db, teacher, 'demo-dakar', new Date(`${DAY}T10:00:00Z`));
    const { works } = await listTermWork(db, teacher, 'demo-dakar', { now: NOW });
    const homeRow = home.corrections.find((row) => row.id === 'demo-dm3');
    expect(homeRow?.waiting).toBe(works.find((w) => w.id === 'demo-dm3')?.toGrade);
    expect(homeRow?.waiting).toBe(22); // 6 copies never handed in are not waiting
  }
});

test('every quarter point comes back unchanged on any scale', () => {
  for (const max of [10, 20, 30, 40, 60, 100]) {
    for (let q = 0; q <= max * 4; q++) {
      const typed = q / 4;
      expect(fromTwenty(toTwenty(typed, max), max)).toBe(typed);
    }
  }
});

test('a missing copy can get a grade and stays marked as not handed in', async () => {
  const db = await testDb();
  await seedDemo(db);
  // sub-dm3-27 was never handed in (status "assigned").
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-27', grade: '0' })).toEqual({ ok: true });
  const [copy] = await db.select().from(submissions).where(eq(submissions.id, 'sub-dm3-27'));
  expect(copy.status).toBe('assigned');
  const dm3 = (await listTermWork(db, 'demo-aissatou', 'demo-dakar', { now: NOW })).works.find((w) => w.id === 'demo-dm3');
  expect(dm3).toMatchObject({ graded: 1, missing: 5, toGrade: 22, total: 28 });
  const home = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(home.corrections.find((row) => row.id === 'demo-dm3')?.graded).toBe(1);
});

test('day starts follow the school time zone', () => {
  const utcMidnight = Date.parse('2026-10-27T00:00:00Z') / 1000;
  expect(schoolDayStart('2026-10-27', 'Africa/Dakar')).toBe(utcMidnight);
  expect(schoolDayStart('2026-10-27', 'Africa/Lagos')).toBe(utcMidnight - 3600);
  expect(schoolDayStart('2026-10-27', 'America/Martinique')).toBe(utcMidnight + 4 * 3600);
});

test('the trimestre average weighs each grade by its coefficient; a coefficient 0 or no grade does not count', () => {
  const khady = [{ value: 12, coefficient: 1 }, { value: 10.5, coefficient: 2 }, { value: 6, coefficient: 1 }, { value: 3.5, coefficient: 1 }];
  expect(weightedAverage(khady)).toBe(8.5);
  expect(weightedAverage([...khady, { value: 20, coefficient: 0 }])).toBe(8.5);
  expect(weightedAverage([{ value: 0, coefficient: 1 }, { value: 13, coefficient: 2 }])).toBe(8.67); // a 0 for "non rendu" counts (D48)
  expect(weightedAverage([])).toBeNull();
  expect(weightedAverage([{ value: 15, coefficient: 0 }])).toBeNull();
  expect(meanOf([8.5, null, 14.5])).toBe(11.5);
  expect(meanOf([null])).toBeNull();
  expect(averageBands([9.99, 10, 13.99, 14, null])).toEqual({ low: 1, mid: 2, high: 1 });
});

test('the gradebook counts every grade of the trimestre, shows each copy state, and follows the course', async () => {
  const db = await testDb();
  await seedDemo(db);
  await db.update(posts).set({ coefficient: 2 }).where(eq(posts.id, 'demo-dm3'));
  const [copy] = await db.select().from(submissions).where(eq(submissions.id, 'sub-dm3-0'));
  expect(await gradeSubmission(db, { ...base, submissionId: 'sub-dm3-0', grade: '15', now: NOW })).toEqual({ ok: true });
  // The seed gives this student a hand-entered 12 (coef. 1) too: (12 + 15 × 2) / 3 = 14.
  await db.insert(grades).values({ id: 'g-extra', schoolId: 'demo-dakar', studentId: copy.studentId, subjectId: 'demo-math', classId: 'demo-4a', termId: 'demo-t1', value: 12, coefficient: 1, createdAt: NOW, updatedAt: NOW });
  await db.delete(grades).where(and(eq(grades.studentId, copy.studentId), eq(grades.classId, 'demo-4a'), isNull(grades.submissionId), ne(grades.id, 'g-extra')));

  const view = await getGradebook(db, 'demo-aissatou', 'demo-dakar', 'demo-4a', 'demo-math', { now: NOW });
  expect(view?.works.map((w) => w.id)).toEqual(['demo-dm3']);
  expect(view?.works[0]).toMatchObject({ coefficient: 2, average: 15, toGrade: 21 });
  const student = view?.students.find((s) => s.id === copy.studentId);
  expect(student).toMatchObject({ cells: [{ kind: 'grade', value: 15 }], other: [12], average: 14 });
  const kinds = view?.students.map((s) => s.cells[0].kind);
  expect(kinds?.filter((k) => k === 'missing')).toHaveLength(6);
  expect(view?.average).toBe(meanOf(view!.students.map((s) => s.average)));
  const names = view!.students.map((s) => s.name);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'fr')));

  // Another trimestre of the year shows its own (empty) columns; a term from another school falls back.
  const [t1] = await db.select().from(terms).where(eq(terms.id, 'demo-t1'));
  await db.insert(terms).values({ ...t1, id: 'demo-t2', name: 'Trimestre 2', position: 2, startsOn: '2026-12-07', endsOn: '2027-03-14' });
  const t2 = await getGradebook(db, 'demo-aissatou', 'demo-dakar', 'demo-4a', 'demo-math', { now: NOW, termId: 'demo-t2' });
  expect(t2).toMatchObject({ works: [], average: null });
  expect((await getGradebook(db, 'demo-aissatou', 'demo-dakar', 'demo-4a', 'demo-math', { now: NOW, termId: 'nope' }))?.context.term?.id).toBe('demo-t1');

  // No course assignment, no gradebook.
  expect(await getGradebook(db, 'someone-else', 'demo-dakar', 'demo-4a', 'demo-math', { now: NOW })).toBeNull();
  expect(await getGradebook(db, 'demo-aissatou', 'other-school', 'demo-4a', 'demo-math', { now: NOW })).toBeNull();
});
