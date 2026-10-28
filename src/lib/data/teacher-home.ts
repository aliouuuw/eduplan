// Teacher home numbers for the Studio screen. Reads the teaching tables only.
import 'server-only';
import { and, eq, exists, inArray, isNull, or, sql } from 'drizzle-orm';

import {
  chapters,
  classChapterPlans,
  classes,
  grades,
  notionCoverage,
  notions,
  posts,
  schools,
  studentEnrollments,
  studentFlags,
  submissions,
  teacherClasses,
  teacherTermGradeTargets,
  timeSlots,
  timetables,
  users,
  attendanceRecords,
} from '@/db/schema';
import type { Database } from '@/lib/db';

import { getAcademicContext } from './academic-context';
import { isWaiting } from './grading';
import { teachesCourse } from './teacher-classes';
import {
  DEFAULT_SCHOOL_TIME_ZONE,
  expectedGradeEntriesAtWeek,
  expectedNotionsAtWeek,
  schoolClockHm,
  schoolDate,
  schoolWeekday,
  termWeekCount,
} from './teacher-home-math';

export function termWeek(now: Date, startsOn: string, weeks: number): number {
  const start = Date.parse(`${startsOn}T00:00:00Z`);
  const days = Math.floor((now.getTime() - start) / 86_400_000);
  const week = Math.floor(days / 7) + 1;
  return Math.min(weeks, Math.max(1, week));
}

export type HomeProgramme = {
  classId: string;
  subjectId: string;
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
  ruleKind: 'average' | 'absences' | 'missing' | null;
};

export type HomeSlot = {
  id: string;
  start: string;
  end: string;
  className: string;
  room: string;
  topic: string;
  placeLabel: string;
  state: 'done' | 'live' | 'later';
  absents: number;
};

export type HomeCorrection = {
  id: string;
  title: string;
  className: string;
  /** Handed in (on time or late), not yet graded. */
  waiting: number;
  graded: number;
  total: number;
  late: number;
};

export type TeacherHome = {
  week: number | null;
  weeks: number;
  termName: string | null;
  copiesToGrade: number;
  copiesHomework: number;
  copiesPaper: number;
  copiesSubmitted: number;
  copiesLate: number;
  gradesEntered: number;
  gradesTarget: number;
  gradesExpected: number;
  gradesByWeek: number[];
  programme: HomeProgramme[];
  flags: HomeFlag[];
  slots: HomeSlot[];
  corrections: HomeCorrection[];
};

function slotState(hm: string, start: string, end: string): HomeSlot['state'] {
  if (hm >= end) return 'done';
  if (hm >= start) return 'live';
  return 'later';
}

function slotPlaceLabel(room: string, topic: string, legacyName: string | null) {
  if (room && topic) return `${room} · ${topic}`;
  if (room) return room;
  return legacyName ?? '';
}

export async function getTeacherHome(
  db: Database,
  teacherId: string,
  schoolId: string,
  now = new Date(),
): Promise<TeacherHome> {
  const [school] = await db.select({ timeZone: schools.timeZone }).from(schools).where(eq(schools.id, schoolId)).limit(1);
  const timeZone = school?.timeZone || DEFAULT_SCHOOL_TIME_ZONE;

  const day = schoolDate(now, timeZone);
  const { year, term } = await getAcademicContext(db, schoolId, { day });
  const links = year ? await db
    .select()
    .from(teacherClasses)
    .innerJoin(classes, eq(teacherClasses.classId, classes.id))
    .where(
      and(
        eq(teacherClasses.teacherId, teacherId),
        eq(teacherClasses.schoolId, schoolId),
        eq(classes.schoolId, schoolId),
        eq(classes.academicYearId, year.id),
      ),
    ) : [];
  const assignments = links.map((row) => row.teacher_classes);
  const headClasses = year ? await db.select().from(classes).where(and(
    eq(classes.schoolId, schoolId),
    eq(classes.academicYearId, year.id),
    eq(classes.headTeacherId, teacherId),
  )) : [];
  const classIds = [...new Set([...assignments.map((row) => row.classId), ...headClasses.map((row) => row.id)])];
  const taught = new Set(assignments.map((row) => `${row.classId}:${row.subjectId}`));

  const weeks = term ? termWeekCount(term.startsOn, term.endsOn) : 12;
  const week = term ? termWeek(now, term.startsOn, weeks) : null;

  const [gradeTargetRow] = term
    ? await db
        .select()
        .from(teacherTermGradeTargets)
        .where(
          and(
            eq(teacherTermGradeTargets.schoolId, schoolId),
            eq(teacherTermGradeTargets.teacherId, teacherId),
            eq(teacherTermGradeTargets.termId, term.id),
          ),
        )
        .limit(1)
    : [undefined];
  const gradesTarget = gradeTargetRow?.expectedEntries ?? 0;
  const gradesExpected = week ? expectedGradeEntriesAtWeek(week, gradesTarget, weeks) : 0;

  const empty: TeacherHome = {
    week,
    weeks,
    termName: term?.name ?? null,
    copiesToGrade: 0,
    copiesHomework: 0,
    copiesPaper: 0,
    copiesSubmitted: 0,
    copiesLate: 0,
    gradesEntered: 0,
    gradesTarget,
    gradesExpected,
    gradesByWeek: Array.from({ length: weeks }, () => 0),
    programme: [],
    flags: [],
    slots: [],
    corrections: [],
  };
  if (!year || classIds.length === 0) return empty;

  const classRows = await db.select().from(classes).where(and(eq(classes.schoolId, schoolId), inArray(classes.id, classIds)));
  const className = new Map(classRows.map((row) => [row.id, row.name]));
  const plans = (await db
    .select()
    .from(classChapterPlans)
    .where(
      and(
        eq(classChapterPlans.schoolId, schoolId),
        inArray(classChapterPlans.classId, classIds),
        eq(classChapterPlans.status, 'current'),
      ),
    )).filter((plan) => taught.has(`${plan.classId}:${plan.subjectId}`));
  const chapterIds = plans.map((plan) => plan.chapterId);
  const chapterRows = chapterIds.length ? await db.select().from(chapters).where(and(eq(chapters.schoolId, schoolId), inArray(chapters.id, chapterIds))) : [];
  const chapterTitle = new Map(chapterRows.map((row) => [row.id, row.title]));
  const notionRows = chapterIds.length ? await db.select().from(notions).where(and(eq(notions.schoolId, schoolId), inArray(notions.chapterId, chapterIds))) : [];
  const coveredRows = await db
    .select()
    .from(notionCoverage)
    .where(and(eq(notionCoverage.schoolId, schoolId), inArray(notionCoverage.classId, classIds)));
  const programme: HomeProgramme[] = [];
  for (const plan of plans) {
    const ids = new Set(notionRows.filter((row) => row.chapterId === plan.chapterId).map((row) => row.id));
    const total = ids.size;
    programme.push({
      classId: plan.classId,
      subjectId: plan.subjectId,
      className: className.get(plan.classId) ?? plan.classId,
      chapter: chapterTitle.get(plan.chapterId) ?? '',
      covered: coveredRows.filter((row) => row.subjectId === plan.subjectId && row.classId === plan.classId && ids.has(row.notionId)).length,
      total,
      expected: week
        ? expectedNotionsAtWeek(week, total, plan.plannedWeekStart, plan.plannedWeekEnd, weeks)
        : 0,
    });
  }

  // Count on the database: do not transfer every student's copy to render a summary.
  const copyCounts = await db
    .select({
      id: posts.id,
      title: posts.title,
      className: classes.name,
      format: posts.assignmentFormat,
      status: submissions.status,
      count: sql<number>`count(*)`.mapWith(Number),
      gradedCount: sql<number>`count(${grades.id})`.mapWith(Number),
    })
    .from(posts)
    .innerJoin(classes, and(eq(posts.classId, classes.id), eq(classes.schoolId, schoolId)))
    .innerJoin(submissions, and(eq(submissions.postId, posts.id), eq(submissions.schoolId, schoolId)))
    .leftJoin(grades, and(eq(grades.submissionId, submissions.id), eq(grades.schoolId, schoolId)))
    .where(and(
      eq(posts.schoolId, schoolId),
      eq(posts.type, 'assignment'),
      eq(classes.academicYearId, year.id),
      teachesCourse(db, teacherId, schoolId, posts.classId, posts.subjectId),
    ))
    .groupBy(posts.id, submissions.status)
    .orderBy(posts.createdAt, posts.id, submissions.status);
  const correctionMap = new Map<string, HomeCorrection>();
  let copiesHomework = 0;
  let copiesPaper = 0;
  let copiesSubmitted = 0;
  let copiesLate = 0;
  for (const row of copyCounts) {
    const correction = correctionMap.get(row.id) ?? {
      id: row.id, title: row.title, className: row.className, waiting: 0, graded: 0, total: 0, late: 0,
    };
    correction.total += row.count;
    // Same rule as the Notes list: only handed-in copies wait for grading; assigned work is neither.
    const waiting = isWaiting(row.status);
    if (waiting) correction.waiting += row.count;
    correction.graded += row.gradedCount; // same count as the Notes list, "non rendu" grades included
    if (row.status === 'late') correction.late += row.count;
    if (row.format === 'paper') {
      if (waiting) copiesPaper += row.count;
    } else {
      if (waiting) copiesHomework += row.count;
      if (row.status === 'submitted') copiesSubmitted += row.count;
      if (row.status === 'late') copiesLate += row.count;
    }
    correctionMap.set(row.id, correction);
  }
  const corrections = [...correctionMap.values()].filter((row) => row.waiting > 0);

  const gradeWeek = term
    ? sql<number>`min(${weeks}, max(1, cast((${grades.createdAt} - ${Date.parse(`${term.startsOn}T00:00:00Z`) / 1000}) / 604800 as integer) + 1))`.mapWith(Number)
    : sql<number>`1`;
  const gradeCounts = term
    ? await db
        .select({ week: gradeWeek, count: sql<number>`count(*)`.mapWith(Number) })
        .from(grades)
        .where(and(
          eq(grades.schoolId, schoolId),
          eq(grades.termId, term.id),
          inArray(grades.classId, classIds),
          teachesCourse(db, teacherId, schoolId, grades.classId, grades.subjectId),
        ))
        .groupBy(gradeWeek)
    : [];
  const weekly = new Map(gradeCounts.map((row) => [row.week, row.count]));
  let gradesEntered = 0;
  const gradesByWeek = Array.from({ length: weeks }, (_, index) => {
    gradesEntered += weekly.get(index + 1) ?? 0;
    return gradesEntered;
  });

  // A subject alone is not permission: the student must be in a taught class.
  // PP follow-up includes every subject, but does not expand the grading scope.
  const flags: HomeFlag[] = await db
    .select({
      id: studentFlags.id,
      student: users.name,
      className: sql<string>`group_concat(distinct ${classes.name})`,
      reason: studentFlags.reason,
      source: studentFlags.source,
      ruleKind: studentFlags.ruleKind,
    })
    .from(studentFlags)
    .innerJoin(users, and(eq(users.id, studentFlags.studentId), eq(users.schoolId, schoolId), isNull(users.deletedAt), eq(users.isActive, true)))
    .innerJoin(studentEnrollments, and(
      eq(studentEnrollments.studentId, studentFlags.studentId),
      eq(studentEnrollments.schoolId, schoolId),
      eq(studentEnrollments.academicYear, year.name),
      eq(studentEnrollments.isActive, true),
    ))
    .innerJoin(classes, and(eq(classes.id, studentEnrollments.classId), eq(classes.schoolId, schoolId), eq(classes.academicYearId, year.id)))
    .where(and(
      eq(studentFlags.schoolId, schoolId),
      isNull(studentFlags.dismissedAt),
      or(
        eq(classes.headTeacherId, teacherId),
        teachesCourse(db, teacherId, schoolId, classes.id, studentFlags.subjectId),
      ),
    ))
    .groupBy(studentFlags.id)
    .orderBy(studentFlags.createdAt, studentFlags.id);

  const weekday = schoolWeekday(now, timeZone);
  const date = day;
  const hm = schoolClockHm(now, timeZone);
  const todaySlots = await db
    .select()
    .from(timeSlots)
    .where(and(eq(timeSlots.schoolId, schoolId), eq(timeSlots.dayOfWeek, weekday)));
  const slotIds = todaySlots.map((row) => row.id);
  const entries = slotIds.length
    ? await db
        .select()
        .from(timetables)
        .where(and(
          eq(timetables.teacherId, teacherId),
          eq(timetables.schoolId, schoolId),
          eq(timetables.academicYear, year.name),
          eq(timetables.status, 'active'),
          inArray(timetables.classId, classIds),
          inArray(timetables.timeSlotId, slotIds),
        ))
    : [];
  const entryIds = entries.map((entry) => entry.id);
  const absentCounts = entryIds.length ? await db
    .select({ timetableId: attendanceRecords.timetableId, count: sql<number>`count(*)`.mapWith(Number) })
    .from(attendanceRecords)
    .where(and(
      eq(attendanceRecords.schoolId, schoolId),
      inArray(attendanceRecords.timetableId, entryIds),
      eq(attendanceRecords.date, date),
      eq(attendanceRecords.status, 'absent'),
    ))
    .groupBy(attendanceRecords.timetableId) : [];
  const absentsByEntry = new Map(absentCounts.map((row) => [row.timetableId, row.count]));
  const slots: HomeSlot[] = [];
  for (const entry of entries) {
    const slot = todaySlots.find((row) => row.id === entry.timeSlotId);
    if (!slot?.startTime || !slot.endTime) continue;
    const room = entry.room ?? '';
    const topic = entry.topic ?? '';
    slots.push({
      id: entry.id,
      start: slot.startTime,
      end: slot.endTime,
      className: className.get(entry.classId) ?? entry.classId,
      room,
      topic,
      placeLabel: slotPlaceLabel(room, topic, slot.name),
      state: slotState(hm, slot.startTime, slot.endTime),
      absents: absentsByEntry.get(entry.id) ?? 0,
    });
  }
  slots.sort((a, b) => a.start.localeCompare(b.start));

  return {
    week,
    weeks,
    termName: term?.name ?? null,
    copiesToGrade: copiesHomework + copiesPaper,
    copiesHomework,
    copiesPaper,
    copiesSubmitted,
    copiesLate,
    gradesEntered,
    gradesTarget,
    gradesExpected,
    gradesByWeek,
    programme,
    flags,
    slots,
    corrections,
  };
}
