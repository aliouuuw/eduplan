import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import { academicYears, terms } from '@/db/schema';

import { defaultTerm, getAcademicContext } from './academic-context';
import { seedDemo } from './demo-seed';
import { testDb } from './test-db';

const T1 = { id: 't1', startsOn: '2026-09-07', endsOn: '2026-11-29' };
const T2 = { id: 't2', startsOn: '2026-12-07', endsOn: '2027-03-14' };
const pick = (day: string) => defaultTerm([T1, T2] as never, day)?.id;

test('default term: today, else the last finished term, else the first', () => {
  expect(pick('2026-10-27')).toBe('t1');
  expect(pick('2026-12-02')).toBe('t1'); // holiday: a teacher still enters last term's grades
  expect(pick('2027-06-01')).toBe('t2');
  expect(pick('2026-08-01')).toBe('t1');
});

test('a term from the URL must belong to the school', async () => {
  const db = await testDb();
  await seedDemo(db);
  const [term] = await db.select().from(terms).limit(1);
  await db.insert(terms).values({ ...term, id: 'foreign-term', schoolId: 'other-school' });
  const context = await getAcademicContext(db, 'demo-dakar', { day: '2026-10-27', termId: 'foreign-term' });
  expect(context.term?.id).toBe('demo-t1');
});

test('closed terms and past years are read-only; the open current term is editable', async () => {
  const db = await testDb();
  await seedDemo(db);
  const day = '2026-10-27';
  expect((await getAcademicContext(db, 'demo-dakar', { day })).editable).toBe(true);

  await db.update(terms).set({ closedAt: new Date() }).where(eq(terms.id, 'demo-t1'));
  expect((await getAcademicContext(db, 'demo-dakar', { day })).editable).toBe(false);

  await db.update(terms).set({ closedAt: null }).where(eq(terms.id, 'demo-t1'));
  await db.update(academicYears).set({ isCurrent: false });
  const [year] = await db.select().from(academicYears).limit(1);
  await db.insert(academicYears).values({ ...year, id: 'next-year', name: '2027-2028', isCurrent: true });
  const past = await getAcademicContext(db, 'demo-dakar', { day, termId: 'demo-t1' });
  expect(past.year?.id).toBe('demo-year');
  expect(past.editable).toBe(false);
});
