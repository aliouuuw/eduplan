import { expect, test } from 'bun:test';

import { getClassProgramme } from './class-programme';
import { seedDemo } from './demo-seed';
import { testDb } from './test-db';

const NOW = new Date('2026-10-27T10:30:00Z');

test('3ème B programme lists five chapters with Thalès en cours', async () => {
  const db = await testDb();
  await seedDemo(db);
  const view = await getClassProgramme(db, 'demo-aissatou', 'demo-dakar', 'demo-3b', NOW);
  expect(view).not.toBeNull();
  expect(view!.chapters).toHaveLength(5);
  expect(view!.chapters[3].status).toBe('current');
  expect(view!.pace).toMatchObject({ covered: 11, total: 20, expected: 13 });
  expect(view!.chapters[3].notions.length).toBe(20);
});
