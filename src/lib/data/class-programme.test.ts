import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import { academicYears, classes, teacherClasses, timetables } from '@/db/schema';

import { getClassProgramme } from './class-programme';
import { seedDemo } from './demo-seed';
import { testDb } from './test-db';

const NOW = new Date('2026-10-27T10:30:00Z');

test('3ème B programme lists five chapters with Thalès en cours', async () => {
  const db = await testDb();
  await seedDemo(db);
  const view = await getClassProgramme(db, 'demo-aissatou', 'demo-dakar', 'demo-3b', 'demo-math', NOW);
  expect(view).not.toBeNull();
  expect(view!.chapters).toHaveLength(5);
  expect(view!.chapters[3].status).toBe('current');
  expect(view!.pace).toMatchObject({ covered: 11, total: 20, expected: 13 });
  expect(view!.subjectId).toBe('demo-math');
  expect(view!.chapters[3].notions.length).toBe(20);
});

test('a teacher does not see another subject in the same class', async () => {
  const db = await testDb();
  await seedDemo(db);
  const view = await getClassProgramme(db, 'demo-aissatou', 'demo-dakar', 'demo-3b', 'demo-french', NOW);
  expect(view).toBeNull();
});

test('an archived class does not inherit the new current years term', async () => {
  const db = await testDb();
  await seedDemo(db);
  await db.update(academicYears).set({ isCurrent: false });
  const [oldYear] = await db.select().from(academicYears).limit(1);
  await db.insert(academicYears).values({ ...oldYear, id: 'new-year', name: '2027-2028', isCurrent: true });
  await db.update(timetables).set({ status: 'draft' }).where(eq(timetables.classId, 'demo-3b'));
  const view = await getClassProgramme(db, 'demo-aissatou', 'demo-dakar', 'demo-3b', 'demo-math', NOW);
  expect(view?.termName).toBe('Trimestre 1');
  expect(view?.roomLabel).toBeNull();
});

test('a malformed assignment cannot grant access to another schools class', async () => {
  const db = await testDb();
  await seedDemo(db);
  const [row] = await db.select().from(classes).where(eq(classes.id, 'demo-3b'));
  await db.insert(classes).values({ ...row, id: 'foreign-class', schoolId: 'other-school' });
  const [assignment] = await db.select().from(teacherClasses).limit(1);
  await db.insert(teacherClasses).values({
    ...assignment, id: 'malformed-assignment', classId: 'foreign-class',
  });
  const view = await getClassProgramme(db, assignment.teacherId, 'demo-dakar', 'foreign-class', assignment.subjectId, NOW);
  expect(view).toBeNull();
});
