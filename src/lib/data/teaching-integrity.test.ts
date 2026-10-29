import { expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';

import { testDb } from './test-db';

const cases = [
  {
    table: 'submissions',
    columns: 'school_id, post_id, student_id, status, created_at, updated_at',
    values: "'school', 'post', 'student', 'submitted', now(), now()",
  },
  {
    table: 'attendance_records',
    columns: 'school_id, timetable_id, student_id, date, status, created_at, updated_at',
    values: "'school', 'lesson', 'student', '2026-10-27', 'present', now(), now()",
  },
  {
    table: 'grades',
    columns: 'school_id, submission_id, student_id, class_id, subject_id, term_id, value, coefficient, created_at, updated_at',
    values: "'school', 'copy', 'student', 'class', 'math', 'term', 12, 1, now(), now()",
  },
  {
    table: 'appreciations',
    columns: 'school_id, student_id, subject_id, term_id, author_id, body, created_at, updated_at',
    values: "'school', 'student', 'math', 'term', 'teacher', 'Bien', now(), now()",
  },
  {
    table: 'appreciations',
    columns: 'school_id, student_id, subject_id, term_id, author_id, body, created_at, updated_at',
    values: "'school', 'student', null, 'term', 'teacher', 'Bien', now(), now()",
  },
  {
    table: 'academic_years',
    columns: 'school_id, name, starts_on, ends_on, is_current, created_at, updated_at',
    values: "'school', '2026-2027', '2026-09-01', '2027-07-31', true, now(), now()",
  },
];

const ids = async (db: Awaited<ReturnType<typeof testDb>>, table: string) =>
  (await db.execute<{ id: string }>(sql.raw(`select id from ${table} order by id`))).rows;

for (const [index, entry] of cases.entries()) {
  test(`the schema rejects duplicate ${entry.table} (${index}) without removing the original`, async () => {
    const db = await testDb();
    const insert = async (id: string, values = entry.values) => db.execute(sql.raw(
      `insert into ${entry.table} (id, ${entry.columns}) values ('${id}', ${values})`,
    ));
    await insert('first');
    const failure = await insert('duplicate').then(() => null, (error: Error) => error);
    expect(failure?.cause).toMatchObject({ message: expect.stringContaining('duplicate key value violates unique constraint') });
    // Identical event keys in a different school must remain independent.
    await insert('other-school', entry.values.replace("'school'", "'other-school'"));
    expect(await ids(db, entry.table)).toEqual([{ id: 'first' }, { id: 'other-school' }]);
  });
}

test('standalone grades remain repeatable; subject and general appreciations coexist', async () => {
  const db = await testDb();
  const grade = cases[2];
  const values = grade.values.replace("'copy'", 'null');
  for (const id of ['grade-one', 'grade-two']) {
    await db.execute(sql.raw(`insert into grades (id, ${grade.columns}) values ('${id}', ${values})`));
  }
  for (const [index, entry] of cases.slice(3, 5).entries()) {
    await db.execute(sql.raw(`insert into appreciations (id, ${entry.columns}) values ('a${index}', ${entry.values})`));
  }
  expect(await ids(db, 'grades')).toHaveLength(2);
  expect(await ids(db, 'appreciations')).toHaveLength(2);
});

test('summary queries are served by an index, never a table scan', async () => {
  const db = await testDb();
  await db.execute(sql`set enable_seqscan = off`); // empty tables: a scan then means no usable index
  const queries = [
    "select * from submissions where school_id = 's' and post_id = 'p'",
    "select * from grades where school_id = 's' and class_id = 'c' and subject_id = 'm' and term_id = 't'",
    "select * from attendance_records where school_id = 's' and timetable_id = 't' and date = '2026-10-27'",
    "select * from student_enrollments where school_id = 's' and student_id = 'u' and academic_year = '2026'",
  ];
  for (const query of queries) {
    const plan = JSON.stringify((await db.execute(sql.raw(`explain ${query}`))).rows);
    expect(plan).toContain('Index');
    expect(plan).not.toContain('Seq Scan');
  }
});
