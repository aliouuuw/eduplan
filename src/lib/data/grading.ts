// Correction of graded work (phase 6). A grade belongs to the trimestre that contains the work's
// due date, else its publication date (D46). Grades are stored /20; a work marked on another
// scale is converted.
import 'server-only';
import { and, asc, desc, eq, exists, gte, lt, sql } from 'drizzle-orm';

import { classes, grades, posts, subjects, submissions, teacherClasses, terms, users } from '@/db/schema';
import type { Database } from '@/lib/db';
import { generateId } from '@/lib/utils';

import { getAcademicContext } from './academic-context';
import { teacherTeachesClass } from './teacher-classes';

const round2 = (n: number) => Math.round(n * 100) / 100;
export const toTwenty = (value: number, max: number) => round2((value * 20) / max);
export const fromTwenty = (value: number, max: number) => round2((value * max) / 20);

/** "11,5" or "11.5" → 11.5. Quarter points only, between 0 and `max`. */
export function parseGrade(text: string, max: number): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= max && Number.isInteger(value * 4) ? value : null;
}

// ponytail: day boundaries in UTC, which is Dakar time; a school in another time zone needs schools.time_zone here.
const dayStart = (day: string) => new Date(`${day}T00:00:00Z`);
const workDay = (post: { dueAt: Date | null; createdAt: Date }) => (post.dueAt ?? post.createdAt).toISOString().slice(0, 10);

async function termOfWork(db: Database, schoolId: string, yearId: string | null, day: string) {
  if (!yearId) return null;
  const [term] = await db
    .select()
    .from(terms)
    .where(and(eq(terms.schoolId, schoolId), eq(terms.academicYearId, yearId), sql`${terms.startsOn} <= ${day}`, sql`${terms.endsOn} >= ${day}`))
    .limit(1);
  return term ?? null;
}

export type TermWork = {
  id: string;
  title: string;
  classId: string;
  className: string;
  subjectName: string;
  format: 'homework' | 'paper' | null;
  coefficient: number;
  day: string;
  toGrade: number;
  graded: number;
  missing: number;
  total: number;
};

/** The teacher's graded work in one trimestre, with copy counts from SQL. */
export async function listTermWork(db: Database, teacherId: string, schoolId: string, { day, termId }: { day: string; termId?: string | null }) {
  const context = await getAcademicContext(db, schoolId, { day, termId });
  const { year, term } = context;
  if (!year || !term) return { context, works: [] as TermWork[] };

  const end = new Date(dayStart(term.endsOn).getTime() + 86_400_000);
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      classId: posts.classId,
      className: classes.name,
      subjectName: subjects.name,
      format: posts.assignmentFormat,
      coefficient: posts.coefficient,
      dueAt: posts.dueAt,
      createdAt: posts.createdAt,
      status: submissions.status,
      count: sql<number>`count(${submissions.id})`.mapWith(Number),
    })
    .from(posts)
    .innerJoin(classes, and(eq(classes.id, posts.classId), eq(classes.schoolId, schoolId), eq(classes.academicYearId, year.id)))
    .innerJoin(subjects, and(eq(subjects.id, posts.subjectId), eq(subjects.schoolId, schoolId)))
    .leftJoin(submissions, and(eq(submissions.postId, posts.id), eq(submissions.schoolId, schoolId)))
    .where(and(
      eq(posts.schoolId, schoolId),
      eq(posts.type, 'assignment'),
      gte(sql`coalesce(${posts.dueAt}, ${posts.createdAt})`, Math.floor(dayStart(term.startsOn).getTime() / 1000)),
      lt(sql`coalesce(${posts.dueAt}, ${posts.createdAt})`, Math.floor(end.getTime() / 1000)),
      // The course, not the author: two teachers of the same class and subject share its work.
      exists(db.select({ id: teacherClasses.id }).from(teacherClasses).where(and(
        eq(teacherClasses.schoolId, schoolId),
        eq(teacherClasses.teacherId, teacherId),
        eq(teacherClasses.classId, posts.classId),
        eq(teacherClasses.subjectId, posts.subjectId),
      ))),
    ))
    .groupBy(posts.id, submissions.status)
    .orderBy(desc(sql`coalesce(${posts.dueAt}, ${posts.createdAt})`), posts.id);

  const works = new Map<string, TermWork>();
  for (const row of rows) {
    const work = works.get(row.id) ?? {
      id: row.id, title: row.title, classId: row.classId, className: row.className, subjectName: row.subjectName,
      format: row.format, coefficient: row.coefficient, day: workDay(row), toGrade: 0, graded: 0, missing: 0, total: 0,
    };
    if (row.status === 'returned') work.graded += row.count;
    else if (row.status === 'assigned') work.missing += row.count;
    else if (row.status) work.toGrade += row.count;
    work.total += row.count;
    works.set(row.id, work);
  }
  return { context, works: [...works.values()] };
}

export type Copy = {
  id: string;
  student: string;
  status: 'assigned' | 'submitted' | 'late' | 'returned';
  submittedAt: Date | null;
  body: string | null;
  /** On the work's own scale. */
  grade: number | null;
  comment: string | null;
};

export async function getCorrection(db: Database, teacherId: string, schoolId: string, postId: string) {
  const [row] = await db
    .select({ post: posts, className: classes.name, yearId: classes.academicYearId, subjectName: subjects.name })
    .from(posts)
    .innerJoin(classes, and(eq(classes.id, posts.classId), eq(classes.schoolId, schoolId)))
    .innerJoin(subjects, and(eq(subjects.id, posts.subjectId), eq(subjects.schoolId, schoolId)))
    .where(and(eq(posts.id, postId), eq(posts.schoolId, schoolId), eq(posts.type, 'assignment')))
    .limit(1);
  if (!row || !(await teacherTeachesClass(db, teacherId, schoolId, row.post.classId, row.post.subjectId))) return null;

  const max = row.post.maxGrade ?? 20;
  const term = await termOfWork(db, schoolId, row.yearId, workDay(row.post));
  const { editable } = term ? await getAcademicContext(db, schoolId, { day: workDay(row.post), termId: term.id }) : { editable: false };
  const copyRows = await db
    .select({
      id: submissions.id,
      student: users.name,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      body: submissions.body,
      value: grades.value,
      comment: grades.comment,
    })
    .from(submissions)
    .innerJoin(users, and(eq(users.id, submissions.studentId), eq(users.schoolId, schoolId)))
    .leftJoin(grades, and(eq(grades.submissionId, submissions.id), eq(grades.schoolId, schoolId)))
    .where(and(eq(submissions.postId, postId), eq(submissions.schoolId, schoolId)))
    .orderBy(asc(users.name), asc(submissions.id));

  const copies: Copy[] = copyRows.map(({ value, ...copy }) => ({ ...copy, grade: value === null ? null : fromTwenty(value, max) }));
  return { ...row, max, term, editable, copies };
}

export type GradeFailure = 'not_found' | 'no_term' | 'closed' | 'invalid_grade';

/** Saves the grade and returns the copy to the student, in one batch. */
export async function gradeSubmission(
  db: Database,
  { teacherId, schoolId, submissionId, grade, comment, now = new Date() }:
  { teacherId: string; schoolId: string; submissionId: string; grade: string; comment: string; now?: Date },
): Promise<{ ok: true } | { ok: false; reason: GradeFailure }> {
  const [row] = await db
    .select({ submission: submissions, post: posts, yearId: classes.academicYearId })
    .from(submissions)
    .innerJoin(posts, and(eq(posts.id, submissions.postId), eq(posts.schoolId, schoolId), eq(posts.type, 'assignment')))
    .innerJoin(classes, and(eq(classes.id, posts.classId), eq(classes.schoolId, schoolId)))
    .where(and(eq(submissions.id, submissionId), eq(submissions.schoolId, schoolId)))
    .limit(1);
  if (!row || !(await teacherTeachesClass(db, teacherId, schoolId, row.post.classId, row.post.subjectId))) {
    return { ok: false, reason: 'not_found' };
  }
  const day = workDay(row.post);
  const term = await termOfWork(db, schoolId, row.yearId, day);
  if (!term) return { ok: false, reason: 'no_term' };
  if (!(await getAcademicContext(db, schoolId, { day, termId: term.id })).editable) return { ok: false, reason: 'closed' };
  const max = row.post.maxGrade ?? 20;
  const value = parseGrade(grade, max);
  if (value === null) return { ok: false, reason: 'invalid_grade' };

  const fields = {
    value: toTwenty(value, max),
    coefficient: row.post.coefficient,
    comment: comment.trim() || null,
    termId: term.id,
    updatedAt: now,
  };
  const [existing] = await db
    .select({ id: grades.id })
    .from(grades)
    .where(and(eq(grades.schoolId, schoolId), eq(grades.submissionId, submissionId)))
    .limit(1);
  await db.batch([
    existing
      ? db.update(grades).set(fields).where(eq(grades.id, existing.id))
      : db.insert(grades).values({
          id: generateId(), schoolId, submissionId, studentId: row.submission.studentId,
          subjectId: row.post.subjectId, classId: row.post.classId, createdAt: now, ...fields,
        }),
    db.update(submissions).set({ status: 'returned', returnedAt: now, updatedAt: now }).where(eq(submissions.id, submissionId)),
  ]);
  return { ok: true };
}
