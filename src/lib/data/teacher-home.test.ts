import { expect, test } from 'bun:test';

import { seedDemo } from './demo-seed';
import { testDb } from './test-db';
import { getTeacherHome, termWeek } from './teacher-home';

const NOW = new Date('2026-10-26T10:00:00Z');

test('26 Oct 2026 is week 8 of the demo term', () => {
  expect(termWeek(NOW, '2026-09-07')).toBe(8);
});

test('Aïssatou home matches the mock counts', async () => {
  const db = await testDb();
  await seedDemo(db);
  const home = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(home.week).toBe(8);
  expect(home.copiesToGrade).toBe(22);
  expect(home.gradesEntered).toBe(9);
  expect(home.flags).toHaveLength(4);
  const byClass = Object.fromEntries(home.programme.map((row) => [row.className, row]));
  expect(byClass['4ème A']).toMatchObject({ covered: 13, total: 18 });
  expect(byClass['4ème B']).toMatchObject({ covered: 10, total: 18 });
  expect(byClass['3ème B']).toMatchObject({ covered: 11, total: 20 });
});
