import { expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';

import { testDb } from './test-db';

const cases = [
  {
    table: 'submissions',
    columns: 'school_id, post_id, student_id, status, created_at, updated_at',
    values: "'school', 'post', 'student', 'submitted', 1, 1",
  },
  {
    table: 'attendance_records',
    columns: 'school_id, timetable_id, student_id, date, status, created_at, updated_at',
    values: "'school', 'lesson', 'student', '2026-10-27', 'present', 1, 1",
  },
  {
    table: 'grades',
    columns: 'school_id, submission_id, student_id, class_id, subject_id, term_id, value, coefficient, created_at, updated_at',
    values: "'school', 'copy', 'student', 'class', 'math', 'term', 12, 1, 1, 1",
  },
  {
    table: 'appreciations',
    columns: 'school_id, student_id, subject_id, term_id, author_id, body, created_at, updated_at',
    values: "'school', 'student', 'math', 'term', 'teacher', 'Bien', 1, 1",
  },
  {
    table: 'appreciations',
    columns: 'school_id, student_id, subject_id, term_id, author_id, body, created_at, updated_at',
    values: "'school', 'student', null, 'term', 'teacher', 'Bien', 1, 1",
  },
  {
    table: 'academic_years',
    columns: 'school_id, name, starts_on, ends_on, is_current, created_at, updated_at',
    values: "'school', '2026-2027', '2026-09-01', '2027-07-31', 1, 1, 1",
  },
];

for (const [index, entry] of cases.entries()) {
  test(`migration rejects duplicate ${entry.table} (${index}) without removing the original`, async () => {
    const db = await testDb();
    const insert = async (id: string, values = entry.values) => db.run(sql.raw(
      `insert into ${entry.table} (id, ${entry.columns}) values ('${id}', ${values})`,
    ));
    await insert('first');
    const failure = await insert('duplicate').then(() => null, (error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(failure?.cause).toMatchObject({ message: expect.stringContaining('UNIQUE constraint failed') });
    // Identical event keys in a different school must remain independent.
    await insert('other-school', entry.values.replace("'school'", "'other-school'"));
    const rows = await db.all(sql.raw(`select id from ${entry.table} order by id`));
    expect(rows).toEqual([{ id: 'first' }, { id: 'other-school' }]);
  });
}

test('standalone grades remain repeatable; subject and general appreciations coexist', async () => {
  const db = await testDb();
  const grade = cases[2];
  const values = grade.values.replace("'copy'", 'null');
  for (const id of ['grade-one', 'grade-two']) {
    await db.run(sql.raw(`insert into grades (id, ${grade.columns}) values ('${id}', ${values})`));
  }
  for (const [index, entry] of cases.slice(3, 5).entries()) {
    await db.run(sql.raw(`insert into appreciations (id, ${entry.columns}) values ('a${index}', ${entry.values})`));
  }
  expect(await db.all(sql`select id from grades`)).toHaveLength(2);
  expect(await db.all(sql`select id from appreciations`)).toHaveLength(2);
});

test('summary queries can use the new indexes', async () => {
  const db = await testDb();
  const queries = [
    ["select * from submissions where school_id = 's' and post_id = 'p'", 'submissions_post_student_uniq'],
    ["select * from grades where school_id = 's' and class_id = 'c' and subject_id = 'm' and term_id = 't'", 'grades_course_term_idx'],
    ["select * from attendance_records where school_id = 's' and timetable_id = 't' and date = '2026-10-27'", 'attendance_lesson_student_uniq'],
    ["select * from student_enrollments where school_id = 's' and student_id = 'u' and academic_year = '2026'", 'enrollments_student_year_idx'],
  ];
  for (const [query, index] of queries) {
    const plan = await db.all(sql.raw(`explain query plan ${query}`));
    expect(JSON.stringify(plan)).toContain(index);
  }
});

test('adding a unique index to dirty data fails without discarding duplicates', async () => {
  const db = await testDb();
  await db.run(sql`drop index submissions_post_student_uniq`);
  const entry = cases[0];
  for (const id of ['original', 'duplicate']) {
    await db.run(sql.raw(`insert into submissions (id, ${entry.columns}) values ('${id}', ${entry.values})`));
  }
  const failure = await (async () => db.run(sql`
    create unique index submissions_post_student_uniq on submissions (school_id, post_id, student_id)
  `))().then(() => null, (error: Error) => error);
  expect(failure?.cause).toMatchObject({ message: expect.stringContaining('UNIQUE constraint failed') });
  expect(await db.all(sql`select id from submissions`)).toHaveLength(2);
});
