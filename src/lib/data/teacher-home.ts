// Teacher home numbers for the Studio screen. Reads the teaching tables only.
import { and, eq, inArray, isNull } from 'drizzle-orm';

import {
  academicYears,
  chapters,
  classChapterPlans,
  classes,
  grades,
  notionCoverage,
  notions,
  posts,
  studentEnrollments,
  studentFlags,
  submissions,
  teacherClasses,
  terms,
  users,
} from '@/db/schema';
import type { Database } from '@/lib/db';

const TERM_WEEKS = 12;

export function termWeek(now: Date, startsOn: string, weeks = TERM_WEEKS): number {
  const start = Date.parse(`${startsOn}T00:00:00Z`);
  const days = Math.floor((now.getTime() - start) / 86_400_000);
  const week = Math.floor(days / 7) + 1;
  return Math.min(weeks, Math.max(1, week));
}

export type HomeProgramme = {
  classId: string;
  className: string;
  chapter: string;
  covered: number;
  total: number;
  expected: number;
};

export type HomeFlag = {
  id: string;
  student: string;
  className: string;
  reason: string;
  source: 'rule' | 'teacher';
};

export type TeacherHome = {
  week: number | null;
  weeks: number;
  copiesToGrade: number;
  gradesEntered: number;
  programme: HomeProgramme[];
  flags: HomeFlag[];
};

export async function getTeacherHome(
  db: Database,
  teacherId: string,
  schoolId: string,
  now = new Date(),
): Promise<TeacherHome> {
  const links = await db
    .select()
    .from(teacherClasses)
    .where(and(eq(teacherClasses.teacherId, teacherId), eq(teacherClasses.schoolId, schoolId)));
  const classIds = links.map((row) => row.classId);
  const subjectIds = [...new Set(links.map((row) => row.subjectId))];

  const [year] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1);
  const termRows = year
    ? await db.select().from(terms).where(and(eq(terms.schoolId, schoolId), eq(terms.academicYearId, year.id)))
    : [];
  const day = now.toISOString().slice(0, 10);
  const term = termRows.find((row) => row.startsOn <= day && row.endsOn >= day);
  const week = term ? termWeek(now, term.startsOn) : null;
  const empty = { week, weeks: TERM_WEEKS, copiesToGrade: 0, gradesEntered: 0, programme: [], flags: [] };
  if (classIds.length === 0) return empty;

  const classRows = await db.select().from(classes).where(inArray(classes.id, classIds));
  const className = new Map(classRows.map((row) => [row.id, row.name]));
  const plans = await db.select().from(classChapterPlans).where(inArray(classChapterPlans.classId, classIds));
  const programme: HomeProgramme[] = [];
  for (const plan of plans) {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, plan.chapterId));
    const notionRows = await db.select().from(notions).where(eq(notions.chapterId, plan.chapterId));
    const coveredRows = await db
      .select()
      .from(notionCoverage)
      .where(and(eq(notionCoverage.classId, plan.classId), eq(notionCoverage.schoolId, schoolId)));
    const ids = new Set(notionRows.map((row) => row.id));
    const total = notionRows.length;
    programme.push({
      classId: plan.classId,
      className: className.get(plan.classId) ?? plan.classId,
      chapter: chapter?.title ?? '',
      covered: coveredRows.filter((row) => ids.has(row.notionId)).length,
      total,
      expected: week ? Math.round((total * week) / TERM_WEEKS) : total,
    });
  }

  const myPosts = await db
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, teacherId), eq(posts.schoolId, schoolId), eq(posts.type, 'assignment')));
  const postIds = myPosts.map((row) => row.id);
  const copies = postIds.length ? await db.select().from(submissions).where(inArray(submissions.postId, postIds)) : [];

  const gradeRows = term
    ? await db
        .select()
        .from(grades)
        .where(and(eq(grades.schoolId, schoolId), eq(grades.termId, term.id), inArray(grades.classId, classIds)))
    : [];

  const flagRows = subjectIds.length
    ? await db
        .select()
        .from(studentFlags)
        .where(and(eq(studentFlags.schoolId, schoolId), inArray(studentFlags.subjectId, subjectIds), isNull(studentFlags.dismissedAt)))
    : [];
  const flags: HomeFlag[] = [];
  for (const flag of flagRows) {
    const [student] = await db.select().from(users).where(eq(users.id, flag.studentId));
    const [enrollment] = await db
      .select()
      .from(studentEnrollments)
      .where(and(eq(studentEnrollments.studentId, flag.studentId), eq(studentEnrollments.schoolId, schoolId), eq(studentEnrollments.isActive, true)));
    flags.push({
      id: flag.id,
      student: student?.name ?? flag.studentId,
      className: className.get(enrollment?.classId ?? '') ?? '',
      reason: flag.reason,
      source: flag.source,
    });
  }

  return {
    week,
    weeks: TERM_WEEKS,
    copiesToGrade: copies.filter((row) => row.status === 'submitted' || row.status === 'late').length,
    gradesEntered: gradeRows.length,
    programme,
    flags,
  };
}
