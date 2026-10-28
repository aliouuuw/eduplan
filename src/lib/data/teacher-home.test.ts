import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import { academicYears, classes, grades, posts, studentEnrollments, studentFlags, submissions, teacherClasses, timetables, users } from '@/db/schema';

import { seedDemo } from './demo-seed';
import { testDb } from './test-db';
import { getTeacherHome, termWeek } from './teacher-home';
import { listTeacherClasses } from './teacher-classes';

const NOW = new Date('2026-10-27T10:30:00Z');

test('27 Oct 2026 is week 8 of the demo term', () => {
  expect(termWeek(NOW, '2026-09-07', 12)).toBe(8);
});

test('Aïssatou home matches the mock counts', async () => {
  const db = await testDb();
  await seedDemo(db);
  const home = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(home.week).toBe(8);
  expect(home.copiesToGrade).toBe(53);
  expect(home.copiesHomework).toBe(22);
  expect(home.copiesPaper).toBe(31);
  expect(home.gradesTarget).toBe(15);
  expect(home.gradesExpected).toBe(10);
  expect(home.termName).toBe('Trimestre 1');
  expect(home.gradesEntered).toBe(9);
  expect(home.flags).toHaveLength(4);
  const byClass = Object.fromEntries(home.programme.map((row) => [row.className, row]));
  expect(byClass['4ème A'].expected).toBe(12);
  expect(byClass['4ème A']).toMatchObject({ covered: 13, total: 18 });
  expect(byClass['4ème B']).toMatchObject({ covered: 10, total: 18 });
  expect(byClass['3ème B']).toMatchObject({ covered: 11, total: 20 });
  expect(home.slots.map((slot) => slot.className)).toEqual(['4ème A', '3ème B', '4ème B', '6ème A']);
  expect(home.slots[0].absents).toBe(2);
  expect(home.slots[1].state).toBe('live');
  expect(home.corrections.find((row) => row.id === 'demo-dm3')?.graded).toBe(0);
});

test('home excludes other subjects, historical work, drafts, and foreign-school copies', async () => {
  const db = await testDb();
  await seedDemo(db);
  const [grade] = await db.select().from(grades).limit(1);
  await db.insert(grades).values({ ...grade, id: 'french-grade', subjectId: 'demo-french' });
  const [assignment] = await db.select().from(teacherClasses).limit(1);
  // Teaching French in another class must not grant French in every maths class.
  await db.insert(teacherClasses).values({ ...assignment, id: 'french-assignment', classId: 'demo-6a', subjectId: 'demo-french' });
  const [currentClass] = await db.select().from(classes).where(eq(classes.id, 'demo-4a'));
  await db.insert(classes).values({ ...currentClass, id: 'old-class', academicYear: '2024-2025' });
  const [post] = await db.select().from(posts).where(eq(posts.id, 'demo-dm3'));
  await db.insert(posts).values({ ...post, id: 'old-post', classId: 'old-class' });
  const [copy] = await db.select().from(submissions).where(eq(submissions.postId, post.id)).limit(1);
  await db.insert(submissions).values([
    { ...copy, id: 'old-copy', postId: 'old-post' },
    { ...copy, id: 'foreign-copy', schoolId: 'other-school' },
  ]);
  const [lesson] = await db.select().from(timetables).limit(1);
  await db.insert(timetables).values({ ...lesson, id: 'old-lesson', academicYear: '2024-2025' });
  await db.update(timetables).set({ status: 'draft' }).where(eq(timetables.id, 'tt-slot-1600'));
  const home = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(home.gradesEntered).toBe(9);
  expect(home.gradesByWeek.at(-1)).toBe(9);
  expect(home.copiesToGrade).toBe(53);
  expect(home.slots).toHaveLength(3);
  expect(home.corrections.map((row) => row.id)).not.toContain('old-post');
});

test('flags require a taught class and subject; PP expands follow-up but not grades', async () => {
  const db = await testDb();
  await seedDemo(db);
  const [flag] = await db.select().from(studentFlags).where(eq(studentFlags.id, 'flag-khady'));
  await db.insert(studentFlags).values({ ...flag, id: 'french-flag', subjectId: 'demo-french' });
  const [currentClass] = await db.select().from(classes).where(eq(classes.id, 'demo-3b'));
  await db.insert(classes).values({ ...currentClass, id: 'untaught-class', headTeacherId: null });
  const [student] = await db.select().from(users).where(eq(users.id, 'stu-khady'));
  await db.insert(users).values({ ...student, id: 'outsider', email: 'outsider@example.test' });
  const [enrollment] = await db.select().from(studentEnrollments).where(eq(studentEnrollments.studentId, student.id));
  await db.insert(studentEnrollments).values({ ...enrollment, id: 'outside-enrollment', studentId: 'outsider', classId: 'untaught-class' });
  await db.insert(studentFlags).values({ ...flag, id: 'outside-flag', studentId: 'outsider' });
  await db.update(classes).set({ headTeacherId: null }).where(eq(classes.id, 'demo-3b'));
  const before = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(before.flags.map((row) => row.id)).not.toContain('french-flag');
  expect(before.flags.map((row) => row.id)).not.toContain('outside-flag');
  await db.update(classes).set({ headTeacherId: 'demo-aissatou' }).where(eq(classes.id, 'demo-3b'));
  const after = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(after.flags.map((row) => row.id)).toContain('french-flag');
  expect(after.flags.map((row) => row.id)).not.toContain('outside-flag');
  expect(after.gradesEntered).toBe(before.gradesEntered);
});

test('missing current year does not expose every archived class', async () => {
  const db = await testDb();
  await seedDemo(db);
  await db.update(academicYears).set({ isCurrent: false });
  expect(await listTeacherClasses(db, 'demo-aissatou', 'demo-dakar')).toEqual([]);
  const home = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(home.slots).toEqual([]);
  expect(home.flags).toEqual([]);
  expect(home.copiesToGrade).toBe(0);
});

test('query count stays constant when the flag list grows', async () => {
  const queries: string[] = [];
  const db = await testDb(queries);
  await seedDemo(db);
  queries.length = 0;
  await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  const before = queries.length;
  const [flag] = await db.select().from(studentFlags).limit(1);
  await db.insert(studentFlags).values(Array.from({ length: 40 }, (_, index) => ({ ...flag, id: `extra-${index}` })));
  queries.length = 0;
  const home = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(home.flags).toHaveLength(44);
  expect(queries.length).toBe(before);
});
