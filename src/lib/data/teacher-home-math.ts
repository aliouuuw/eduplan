/** Term calendar helpers shared by teacher-home and tests. */

export function termWeekCount(startsOn: string, endsOn: string): number {
  const start = Date.parse(`${startsOn}T00:00:00Z`);
  const end = Date.parse(`${endsOn}T00:00:00Z`);
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return Math.max(1, Math.ceil(days / 7));
}

/** Notions expected by the end of `week`, from the class chapter window (D8, D13). */
export function expectedNotionsAtWeek(
  week: number,
  total: number,
  plannedWeekStart: number | null,
  plannedWeekEnd: number | null,
  termWeeks: number,
): number {
  if (total === 0 || week <= 0) return 0;
  if (plannedWeekStart != null && plannedWeekEnd != null) {
    if (week < plannedWeekStart) return 0;
    if (week >= plannedWeekEnd) return total;
    const span = plannedWeekEnd - plannedWeekStart + 1;
    const elapsed = week - plannedWeekStart + 1;
    return Math.round((total * elapsed) / span);
  }
  return Math.round((total * week) / termWeeks);
}

/** Linear council pace: how many grade entries should exist by `week`. */
export function expectedGradeEntriesAtWeek(week: number, target: number, termWeeks: number): number {
  if (target === 0 || week <= 0) return 0;
  return Math.round((target * week) / termWeeks);
}

/** Cumulative grade counts per term week (1-indexed buckets). */
export function cumulativeGradesByWeek(
  rows: { createdAt: Date }[],
  termStartsOn: string,
  termWeeks: number,
  weekOf: (date: Date, startsOn: string, weeks: number) => number,
): number[] {
  const counts = Array.from({ length: termWeeks }, () => 0);
  for (const row of rows) {
    const w = weekOf(row.createdAt, termStartsOn, termWeeks);
    if (w >= 1 && w <= termWeeks) counts[w - 1]++;
  }
  let sum = 0;
  return counts.map((n) => {
    sum += n;
    return sum;
  });
}
