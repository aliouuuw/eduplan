// Read-only preflight for migration 0011. Never chooses or deletes duplicate rows.
import { sql } from 'drizzle-orm';

import { db } from '../src/lib/db';

const checks = [
  ['submissions', 'school_id, post_id, student_id', '1 = 1'],
  ['attendance_records', 'school_id, timetable_id, date, student_id', '1 = 1'],
  ['grades', 'school_id, submission_id', 'submission_id is not null'],
  ['appreciations (subject)', 'school_id, student_id, term_id, subject_id', 'subject_id is not null'],
  ['appreciations (general)', 'school_id, student_id, term_id', 'subject_id is null'],
  ['academic_years', 'school_id', 'is_current = 1'],
];

let duplicateGroups = 0;
for (const [label, columns, where] of checks) {
  const table = label.split(' ')[0];
  const [row] = await db.all<{ count: number }>(sql.raw(
    `select count(*) as count from (
      select ${columns} from ${table} where ${where}
      group by ${columns} having count(*) > 1
    )`,
  ));
  const count = Number(row.count);
  duplicateGroups += count;
  console.log(`${label}: ${count} duplicate groups`);
}

if (duplicateGroups > 0) {
  console.error('Do not apply migration 0011. Review duplicate rows first. No rows were changed.');
  process.exitCode = 1;
} else {
  console.log('No conflicting keys found. Take a backup before applying migration 0011.');
}
