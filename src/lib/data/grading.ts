// Correction of graded work (phase 6). A grade belongs to the trimestre of the work's due date,
// else its publication date (D46). Grades are stored /20; a work marked on another scale is converted.
import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { academicYears, classes, grades, posts, schools, subjects, submissions, terms, users } from '@/db/schema';
import type { Database } from '@/lib/db';
import { generateId } from '@/lib/utils';

import { getAcademicContext } from './academic-context';
import { DEFAULT_SCHOOL_TIME_ZONE, schoolDate, schoolDayStart } from './teacher-home-math';
import { teachesCourse, teacherTeachesClass } from './teacher-classes';

type Term = typeof terms.$inferSelect;
type CopyStatus = (typeof submissions.$inferSelect)['status'];

const round2 = (n: number) => Math.round(n * 100) / 100;
export const toTwenty = (value: number, max: number) => round2((value * 20) / max);
// Snap to the quarter point: a grade stored /20 at 2 decimals must come back exactly as it was typed.
export const fromTwenty = (value: number, max: number) => Math.round(((value * max) / 20) * 4) / 4;

/** A handed-in copy (on time or late) that still waits for its grade. The home and the Notes list share this rule. */
export const isWaiting = (status: CopyStatus | null) => status === 'submitted' || status === 'late';

/** "11,5" or "11.5" → 11.5. Quarter points only, between 0 and `max`. */
export function parseGrade(text: string, max: number): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= max && Number.isInteger(value * 4) ? value : null;
}

/**
 * D47: each trimestre owns the days after the previous one ends, up to its own end; the last one
 * has no end. A work dated in a holiday gap therefore counts in the next trimestre, and every date
 * of the year lands in exactly one. `rows` must be in position order.
 */
export function termForDay(rows: Term[], day: string): Term | null {
  return rows.find((term) => day <= term.endsOn) ?? rows.at(-1) ?? null;
}

// Days follow the school's own clock (schools.time_zone), like the home.
const nextDay = (day: string, timeZone: string) =>
  schoolDayStart(new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10), timeZone);
const workDay = (post: { dueAt: Date | null; createdAt: Date }, timeZone: string) => schoolDate(post.dueAt ?? post.createdAt, timeZone);

async function schoolTimeZone(db: Database, schoolId: string) {
  const [row] = await db.select({ timeZone: schools.timeZone }).from(schools).where(eq(schools.id, schoolId)).limit(1);
  return row?.timeZone || DEFAULT_SCHOOL_TIME_ZONE;
}
const workDate = sql`coalesce(${posts.dueAt}, ${posts.createdAt})`;

async function yearTerms(db: Database, schoolId: string, yearId: string | null) {
  if (!yearId) return [];
  return db.select().from(terms).where(and(eq(terms.schoolId, schoolId), eq(terms.academicYearId, yearId))).orderBy(asc(terms.position));
}

/** Writable only in an open trimestre of the current year (D41). */
function workContext(rows: Term[], day: string, yearCurrent: boolean | null) {
  const term = termForDay(rows, day);
  const lock: 'no_term' | 'past_year' | 'closed' | null = !term ? 'no_term' : !yearCurrent ? 'past_year' : term.closedAt ? 'closed' : null;
  return { term, lock };
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
export async function listTermWork(db: Database, teacherId: string, schoolId: string, { now = new Date(), termId }: { now?: Date; termId?: string | null }) {
  const timeZone = await schoolTimeZone(db, schoolId);
  const context = await getAcademicContext(db, schoolId, { day: schoolDate(now, timeZone), termId });
  const { year, term, terms: rows } = context;
  if (!year || !term) return { context, works: [] as TermWork[] };

  // The same window as termForDay, in SQL.
  const index = rows.findIndex((row) => row.id === term.id);
  const previous = rows[index - 1];
  const last = index === rows.length - 1;
  const rowsSql = await db
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
      gradedCount: sql<number>`count(${grades.id})`.mapWith(Number),
    })
    .from(posts)
    .innerJoin(classes, and(eq(classes.id, posts.classId), eq(classes.schoolId, schoolId), eq(classes.academicYearId, year.id)))
    .innerJoin(subjects, and(eq(subjects.id, posts.subjectId), eq(subjects.schoolId, schoolId)))
    .leftJoin(submissions, and(eq(submissions.postId, posts.id), eq(submissions.schoolId, schoolId)))
    .leftJoin(grades, and(eq(grades.submissionId, submissions.id), eq(grades.schoolId, schoolId)))
    .where(and(
      eq(posts.schoolId, schoolId),
      eq(posts.type, 'assignment'),
      previous ? gte(workDate, nextDay(previous.endsOn, timeZone)) : undefined,
      last ? undefined : lt(workDate, nextDay(term.endsOn, timeZone)),
      teachesCourse(db, teacherId, schoolId, posts.classId, posts.subjectId),
    ))
    .groupBy(posts.id, submissions.status)
    .orderBy(desc(workDate), posts.id);

  const works = new Map<string, TermWork>();
  for (const row of rowsSql) {
    const work = works.get(row.id) ?? {
      id: row.id, title: row.title, classId: row.classId, className: row.className, subjectName: row.subjectName,
      format: row.format, coefficient: row.coefficient, day: workDay(row, timeZone), toGrade: 0, graded: 0, missing: 0, total: 0,
    };
    // A copy never handed in can still get a grade (a 0 for "non rendu"): it counts as graded, not missing.
    work.graded += row.gradedCount;
    if (row.status === 'assigned') work.missing += row.count - row.gradedCount;
    else if (isWaiting(row.status)) work.toGrade += row.count;
    work.total += row.count;
    works.set(row.id, work);
  }
  return { context, works: [...works.values()] };
}

export type Copy = {
  id: string;
  student: string;
  status: CopyStatus;
  submittedAt: Date | null;
  body: string | null;
  /** On the work's own scale. */
  grade: number | null;
  comment: string | null;
};

// The work, its class, subject, and the class's year in one query: the lock needs only isCurrent from the year.
const workFields = {
  post: posts, className: classes.name, subjectName: subjects.name, timeZone: schools.timeZone,
  yearId: classes.academicYearId, yearName: academicYears.name, yearCurrent: academicYears.isCurrent,
};


export async function getCorrection(db: Database, teacherId: string, schoolId: string, postId: string) {
  const [row] = await db.select(workFields).from(posts)
    .innerJoin(classes, and(eq(classes.id, posts.classId), eq(classes.schoolId, schoolId)))
    .innerJoin(subjects, and(eq(subjects.id, posts.subjectId), eq(subjects.schoolId, schoolId)))
    .leftJoin(academicYears, and(eq(academicYears.id, classes.academicYearId), eq(academicYears.schoolId, schoolId)))
    .innerJoin(schools, eq(schools.id, posts.schoolId))
    .where(and(eq(posts.id, postId), eq(posts.schoolId, schoolId), eq(posts.type, 'assignment')))
    .limit(1);
  if (!row || !(await teacherTeachesClass(db, teacherId, schoolId, row.post.classId, row.post.subjectId))) return null;
  const max = row.post.maxGrade ?? 20;
  const { term, lock } = workContext(await yearTerms(db, schoolId, row.yearId), workDay(row.post, row.timeZone), row.yearCurrent);
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
  return {
    post: row.post, className: row.className, subjectName: row.subjectName, yearName: row.yearName,
    max, term, lock, editable: lock === null, copies,
  };
}

export type GradeFailure = 'not_found' | 'no_term' | 'past_year' | 'closed' | 'invalid_grade';

/** Saves the grade and returns the copy to the student, in one batch. */
export async function gradeSubmission(
  db: Database,
  { teacherId, schoolId, submissionId, grade, comment, now = new Date() }:
  { teacherId: string; schoolId: string; submissionId: string; grade: string; comment: string; now?: Date },
): Promise<{ ok: true } | { ok: false; reason: GradeFailure }> {
  const [row] = await db.select({ ...workFields, studentId: submissions.studentId, copyStatus: submissions.status }).from(posts)
    .innerJoin(classes, and(eq(classes.id, posts.classId), eq(classes.schoolId, schoolId)))
    .innerJoin(subjects, and(eq(subjects.id, posts.subjectId), eq(subjects.schoolId, schoolId)))
    .leftJoin(academicYears, and(eq(academicYears.id, classes.academicYearId), eq(academicYears.schoolId, schoolId)))
    .innerJoin(schools, eq(schools.id, posts.schoolId))
    .innerJoin(submissions, and(eq(submissions.postId, posts.id), eq(submissions.schoolId, schoolId)))
    .where(and(eq(submissions.id, submissionId), eq(posts.schoolId, schoolId), eq(posts.type, 'assignment')))
    .limit(1);
  if (!row || !(await teacherTeachesClass(db, teacherId, schoolId, row.post.classId, row.post.subjectId))) {
    return { ok: false, reason: 'not_found' };
  }
  const { term, lock } = workContext(await yearTerms(db, schoolId, row.yearId), workDay(row.post, row.timeZone), row.yearCurrent);
  if (lock || !term) return { ok: false, reason: lock ?? 'no_term' };
  const max = row.post.maxGrade ?? 20;
  const value = parseGrade(grade, max);
  if (value === null) return { ok: false, reason: 'invalid_grade' };

  const fields = { value: toTwenty(value, max), coefficient: row.post.coefficient, comment: comment.trim() || null, termId: term.id, updatedAt: now };
  await db.batch([
    // One statement: two saves of the same copy at once update the one row instead of colliding.
    db.insert(grades)
      .values({ id: generateId(), schoolId, submissionId, studentId: row.studentId, subjectId: row.post.subjectId, classId: row.post.classId, createdAt: now, ...fields })
      .onConflictDoUpdate({ target: [grades.schoolId, grades.submissionId], targetWhere: sql`${grades.submissionId} is not null`, set: fields }),
    // A missing copy keeps "assigned": the grade (often 0) never makes it look handed in.
    db.update(submissions).set({ status: row.copyStatus === 'assigned' ? 'assigned' : 'returned', returnedAt: now, updatedAt: now }).where(eq(submissions.id, submissionId)),
  ]);
  return { ok: true };
}

/**
 * Grades copy the work's coefficient and trimestre when saved. Call this after a work's date or
 * coefficient changes, so its grades follow (D46).
 */
export async function syncWorkGrades(db: Database, schoolId: string, postId: string, now = new Date()) {
  const [row] = await db.select(workFields).from(posts)
    .innerJoin(classes, and(eq(classes.id, posts.classId), eq(classes.schoolId, schoolId)))
    .innerJoin(subjects, and(eq(subjects.id, posts.subjectId), eq(subjects.schoolId, schoolId)))
    .leftJoin(academicYears, and(eq(academicYears.id, classes.academicYearId), eq(academicYears.schoolId, schoolId)))
    .innerJoin(schools, eq(schools.id, posts.schoolId))
    .where(and(eq(posts.id, postId), eq(posts.schoolId, schoolId))).limit(1);
  if (!row) return;
  const term = termForDay(await yearTerms(db, schoolId, row.yearId), workDay(row.post, row.timeZone));
  if (!term) return;
  await db.update(grades).set({ coefficient: row.post.coefficient, termId: term.id, updatedAt: now }).where(and(
    eq(grades.schoolId, schoolId),
    inArray(grades.submissionId, db.select({ id: submissions.id }).from(submissions).where(and(eq(submissions.postId, postId), eq(submissions.schoolId, schoolId)))),
  ));
}
