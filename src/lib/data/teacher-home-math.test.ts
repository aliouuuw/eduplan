import { expect, test } from 'bun:test';

import { expectedNotionsAtWeek, schoolDate, schoolWeekday, termWeekCount } from './teacher-home-math';

test('demo trimestre 1 spans 12 weeks', () => {
  expect(termWeekCount('2026-09-07', '2026-11-29')).toBe(12);
});

test('4ème A expects 12 notions at week 8 when the chapter is planned S5–S10', () => {
  expect(expectedNotionsAtWeek(8, 18, 5, 10, 12)).toBe(12);
});

test('Dakar Tuesday 27 Oct 2026 is school weekday 2', () => {
  const now = new Date('2026-10-27T10:30:00Z');
  expect(schoolDate(now, 'Africa/Dakar')).toBe('2026-10-27');
  expect(schoolWeekday(now, 'Africa/Dakar')).toBe(2);
});
