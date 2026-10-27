import { expect, test } from 'bun:test';

import { expectedNotionsAtWeek, termWeekCount } from './teacher-home-math';

test('demo trimestre 1 spans 12 weeks', () => {
  expect(termWeekCount('2026-09-07', '2026-11-29')).toBe(12);
});

test('4ème A expects 12 notions at week 8 when the chapter is planned S5–S10', () => {
  expect(expectedNotionsAtWeek(8, 18, 5, 10, 12)).toBe(12);
});
