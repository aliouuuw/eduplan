import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import { academicYears, classes, terms } from '@/db/schema';

import { createYear, listYears, setCurrentYear, setTermClosed, yearInput } from './academic-years';
import { seedDemo } from './demo-seed';
import { testDb } from './test-db';

const NEXT = {
  name: '2027-2028',
  startsOn: '2027-09-06',
  endsOn: '2028-07-07',
  terms: [
    { name: 'Trimestre 1', startsOn: '2027-09-06', endsOn: '2027-12-17' },
    { name: 'Trimestre 2', startsOn: '2028-01-03', endsOn: '2028-03-31' },
    { name: 'Trimestre 3', startsOn: '2028-04-10', endsOn: '2028-07-07' },
  ],
};

test('terms must sit inside the year, in order, without overlap', () => {
  expect(yearInput.safeParse(NEXT).success).toBe(true);
  const bad = (terms: typeof NEXT.terms) => yearInput.safeParse({ ...NEXT, terms }).error?.issues[0]?.message;
  expect(bad([{ ...NEXT.terms[0], endsOn: '2027-09-01' }])).toContain('finir après');
  expect(bad([{ ...NEXT.terms[0], startsOn: '2027-08-01' }])).toContain("compris dans l'année");
  expect(bad([NEXT.terms[1], NEXT.terms[0]])).toContain('après la fin');
  expect(yearInput.safeParse({ ...NEXT, endsOn: NEXT.startsOn }).success).toBe(false);
});

test('a first year becomes current, links classes by label, and keeps other schools apart', async () => {
  const db = await testDb();
  await seedDemo(db);
  const [row] = await db.select().from(classes).where(eq(classes.id, 'demo-3b'));
  await db.insert(classes).values([
    { ...row, id: 'next-3b', academicYear: '2027-2028', academicYearId: null },
    { ...row, id: 'foreign-3b', schoolId: 'other-school', academicYear: '2027-2028', academicYearId: null },
  ]);

  const created = await createYear(db, 'demo-dakar', NEXT);
  expect(created.ok).toBe(true);
  const [next] = await db.select().from(academicYears).where(eq(academicYears.name, '2027-2028'));
  expect(next.isCurrent).toBe(false); // the demo school already has a current year
  const linked = new Map((await db.select().from(classes)).map((c) => [c.id, c.academicYearId]));
  expect(linked.get('next-3b')).toBe(next.id);
  expect(linked.get('foreign-3b')).toBeNull();
  expect((await listYears(db, 'demo-dakar'))[0].terms.map((t) => t.position)).toEqual([1, 2, 3]);

  const fresh = await createYear(db, 'other-school', NEXT);
  const [first] = await db.select().from(academicYears).where(eq(academicYears.schoolId, 'other-school'));
  expect(fresh.ok && first.isCurrent).toBe(true);
});

test('duplicate names and overlapping years are refused', async () => {
  const db = await testDb();
  await seedDemo(db);
  expect(await createYear(db, 'demo-dakar', { ...NEXT, name: '2025-2026' })).toMatchObject({ reason: 'duplicate_name' });
  expect(await createYear(db, 'demo-dakar', { ...NEXT, startsOn: '2027-06-01' })).toMatchObject({ reason: 'overlap' });
});

test('switching the current year and closing a term stay inside the school', async () => {
  const db = await testDb();
  await seedDemo(db);
  const created = await createYear(db, 'demo-dakar', NEXT);
  if (!created.ok) throw new Error('setup');
  expect(await setCurrentYear(db, 'other-school', created.id)).toBe(false);
  expect(await setCurrentYear(db, 'demo-dakar', created.id)).toBe(true);
  const current = await db.select().from(academicYears).where(eq(academicYears.isCurrent, true));
  expect(current.map((y) => y.id)).toEqual([created.id]);

  expect(await setTermClosed(db, 'other-school', 'demo-t1', true)).toBe(false);
  expect(await setTermClosed(db, 'demo-dakar', 'demo-t1', true)).toBe(true);
  const [term] = await db.select().from(terms).where(eq(terms.id, 'demo-t1'));
  expect(term.closedAt).not.toBeNull();
});
