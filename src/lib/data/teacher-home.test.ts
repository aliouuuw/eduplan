import { expect, test } from 'bun:test';

import { seedDemo } from './demo-seed';
import { testDb } from './test-db';
import { getTeacherHome, termWeek } from './teacher-home';

const NOW = new Date('2026-10-27T10:30:00Z');

test('27 Oct 2026 is week 8 of the demo term', () => {
  expect(termWeek(NOW, '2026-09-07')).toBe(8);
});

test('Aïssatou home matches the mock counts', async () => {
  const db = await testDb();
  await seedDemo(db);
  const home = await getTeacherHome(db, 'demo-aissatou', 'demo-dakar', NOW);
  expect(home.week).toBe(8);
  expect(home.copiesToGrade).toBe(53);
  expect(home.gradesTarget).toBe(15);
  expect(home.gradesExpected).toBe(10);
  expect(home.gradesEntered).toBe(9);
  expect(home.flags).toHaveLength(4);
  const byClass = Object.fromEntries(home.programme.map((row) => [row.className, row]));
  expect(byClass['4ème A']).toMatchObject({ covered: 13, total: 18 });
  expect(byClass['4ème B']).toMatchObject({ covered: 10, total: 18 });
  expect(byClass['3ème B']).toMatchObject({ covered: 11, total: 20 });
  expect(home.slots.map((slot) => slot.className)).toEqual(['4ème A', '3ème B', '4ème B', '6ème A']);
  expect(home.slots[0].absents).toBe(2);
  expect(home.slots[1].state).toBe('live');
});
