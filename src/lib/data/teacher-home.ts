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
  teacherTermGradeTargets,
  terms,
  timeSlots,
  timetables,
  users,
  attendanceRecords,
} from '@/db/schema';
import type { Database } from '@/lib/db';

import {
  cumulativeGradesByWeek,
  expectedGradeEntriesAtWeek,
  expectedNotionsAtWeek,
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

export function schoolWeekday(now: Date): number {
  const day = now.getUTCDay();
  return day === 0 ? 7 : day;
}

function slotState(now: Date, start: string, end: string): HomeSlot['state'] {
  const hm = now.toISOString().slice(11, 16);
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
  if (classIds.length === 0) return empty;

  const classRows = await db.select().from(classes).where(inArray(classes.id, classIds));
  const className = new Map(classRows.map((row) => [row.id, row.name]));
  const plans = await db
    .select()
    .from(classChapterPlans)
    .where(and(inArray(classChapterPlans.classId, classIds), eq(classChapterPlans.status, 'current')));
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
      expected: week
        ? expectedNotionsAtWeek(week, total, plan.plannedWeekStart, plan.plannedWeekEnd, weeks)
        : 0,
    });
  }

  const myPosts = await db
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, teacherId), eq(posts.schoolId, schoolId), eq(posts.type, 'assignment')));
  const postFormat = new Map(myPosts.map((row) => [row.id, row.assignmentFormat ?? 'homework']));
  const postIds = myPosts.map((row) => row.id);
  const copies = postIds.length ? await db.select().from(submissions).where(inArray(submissions.postId, postIds)) : [];
  const corrections: HomeCorrection[] = [];
  for (const post of myPosts) {
    const rows = copies.filter((row) => row.postId === post.id);
    const waiting = rows.filter((row) => row.status === 'submitted' || row.status === 'late');
    if (waiting.length === 0) continue;
    corrections.push({
      id: post.id,
      title: post.title,
      className: className.get(post.classId) ?? post.classId,
      graded: rows.length - waiting.length,
      total: rows.length,
      late: rows.filter((row) => row.status === 'late').length,
    });
  }

  const gradeRows = term
    ? await db
        .select()
        .from(grades)
        .where(and(eq(grades.schoolId, schoolId), eq(grades.termId, term.id), inArray(grades.classId, classIds)))
    : [];
  const gradesByWeek = term
    ? cumulativeGradesByWeek(gradeRows, term.startsOn, weeks, termWeek)
    : Array.from({ length: weeks }, () => 0);

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
      ruleKind: flag.ruleKind,
    });
  }

  const weekday = schoolWeekday(now);
  const date = now.toISOString().slice(0, 10);
  const todaySlots = await db
    .select()
    .from(timeSlots)
    .where(and(eq(timeSlots.schoolId, schoolId), eq(timeSlots.dayOfWeek, weekday)));
  const slotIds = todaySlots.map((row) => row.id);
  const entries = slotIds.length
    ? await db
        .select()
        .from(timetables)
        .where(and(eq(timetables.teacherId, teacherId), eq(timetables.schoolId, schoolId), inArray(timetables.timeSlotId, slotIds)))
    : [];
  const slots: HomeSlot[] = [];
  for (const entry of entries) {
    const slot = todaySlots.find((row) => row.id === entry.timeSlotId);
    if (!slot?.startTime || !slot.endTime) continue;
    const absents = await db
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.timetableId, entry.id), eq(attendanceRecords.date, date), eq(attendanceRecords.status, 'absent')));
    const room = slot.room ?? '';
    const topic = slot.topic ?? '';
    slots.push({
      id: entry.id,
      start: slot.startTime,
      end: slot.endTime,
      className: className.get(entry.classId) ?? entry.classId,
      room,
      topic,
      placeLabel: slotPlaceLabel(room, topic, slot.name),
      state: slotState(now, slot.startTime, slot.endTime),
      absents: absents.length,
    });
  }
  slots.sort((a, b) => a.start.localeCompare(b.start));

  const waiting = copies.filter((row) => row.status === 'submitted' || row.status === 'late');
  const homeworkWaiting = waiting.filter((row) => postFormat.get(row.postId) !== 'paper');
  const paperWaiting = waiting.filter((row) => postFormat.get(row.postId) === 'paper');
  const homeworkCopies = copies.filter((row) => postFormat.get(row.postId) !== 'paper');

  return {
    week,
    weeks,
    termName: term?.name ?? null,
    copiesToGrade: waiting.length,
    copiesHomework: homeworkWaiting.length,
    copiesPaper: paperWaiting.length,
    copiesSubmitted: homeworkCopies.filter((row) => row.status === 'submitted').length,
    copiesLate: homeworkCopies.filter((row) => row.status === 'late').length,
    gradesEntered: gradeRows.length,
    gradesTarget,
    gradesExpected,
    gradesByWeek,
    programme,
    flags,
    slots,
    corrections,
  };
}
