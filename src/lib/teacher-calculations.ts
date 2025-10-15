/**
 * Pure calculation utilities for teacher metrics
 * No database dependencies
 */

/**
 * Calculate weekly teaching load from teacher subjects
 */
export function calculateWeeklyTeachingLoad(
  teacherSubjects: Array<{ subjectId: string; weeklyHours: number | null }>,
  subjects: Array<{ id: string; weeklyHours: number | null }>
): number {
  return teacherSubjects.reduce((total, ts) => {
    const subject = subjects.find(s => s.id === ts.subjectId);
    const hours = ts.weeklyHours ?? subject?.weeklyHours ?? 0;
    return total + hours;
  }, 0);
}
