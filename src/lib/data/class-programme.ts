import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import {
  academicYears,
  chapters,
  classChapterPlans,
  classes,
  notionCoverage,
  notions,
  programmes,
  studentEnrollments,
  subjects,
  teacherClasses,
  terms,
  timeSlots,
  timetables,
} from '@/db/schema';
import type { Database } from '@/lib/db';

import { expectedNotionsAtWeek, termWeekCount } from './teacher-home-math';
import { schoolWeekday, termWeek } from './teacher-home';
import { teacherTeachesClass } from './teacher-classes';

export type ProgrammeNotion = {
  id: string;
  title: string;
  covered: boolean;
  hint?: string;
};

export type ProgrammeChapter = {
  id: string;
  index: number;
  title: string;
  weekLabel: string;
  status: 'done' | 'current' | 'upcoming';
  stateLabel: string;
  notions: ProgrammeNotion[];
};

export type ClassProgramme = {
  classId: string;
  className: string;
  subjectName: string;
  studentCount: number;
  roomLabel: string | null;
  termName: string | null;
  week: number | null;
  weeks: number;
  chapters: ProgrammeChapter[];
  pace: {
    covered: number;
    total: number;
    expected: number;
    behind: number;
    remaining: number;
    weeksLeft: number;
    perWeek: number;
  };
};

function weekLabel(start: number | null, end: number | null) {
  if (start == null || end == null) return '';
  return start === end ? `S${start}` : `S${start} à S${end}`;
}

function stateLabel(status: 'done' | 'current' | 'upcoming', covered: number, total: number, expected: number) {
  if (status === 'done') return 'Terminé';
  if (status === 'upcoming') return total > 0 ? `À venir · ${total} notion${total > 1 ? 's' : ''}` : 'À venir';
  const behind = expected - covered;
  if (behind > 0) return `${behind} notion${behind > 1 ? 's' : ''} de retard`;
  if (behind < 0) return `${-behind} notion${behind < -1 ? 's' : ''} d'avance`;
  return 'Au rythme';
}

export async function getClassProgramme(
  db: Database,
  teacherId: string,
  schoolId: string,
  classId: string,
  now = new Date(),
): Promise<ClassProgramme | null> {
  if (!(await teacherTeachesClass(db, teacherId, schoolId, classId))) return null;

  const [assignment] = await db
    .select({ subjectId: teacherClasses.subjectId, subjectName: subjects.name })
    .from(teacherClasses)
    .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
    .where(and(eq(teacherClasses.teacherId, teacherId), eq(teacherClasses.classId, classId), eq(teacherClasses.schoolId, schoolId)))
    .limit(1);
  if (!assignment) return null;

  const [classRow] = await db.select().from(classes).where(eq(classes.id, classId));
  const enrollments = await db
    .select()
    .from(studentEnrollments)
    .where(and(eq(studentEnrollments.classId, classId), eq(studentEnrollments.schoolId, schoolId), eq(studentEnrollments.isActive, true)));

  const [year] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1);
  const termRows = year ? await db.select().from(terms).where(and(eq(terms.schoolId, schoolId), eq(terms.academicYearId, year.id))) : [];
  const day = now.toISOString().slice(0, 10);
  const term = termRows.find((row) => row.startsOn <= day && row.endsOn >= day);
  const weeks = term ? termWeekCount(term.startsOn, term.endsOn) : 12;
  const week = term ? termWeek(now, term.startsOn, weeks) : null;

  const [programme] = classRow
    ? await db
        .select()
        .from(programmes)
        .where(
          and(
            eq(programmes.schoolId, schoolId),
            eq(programmes.subjectId, assignment.subjectId),
            eq(programmes.levelId, classRow.levelId),
          ),
        )
        .limit(1)
    : [undefined];
  const chapterRows = programme
    ? await db.select().from(chapters).where(eq(chapters.programmeId, programme.id)).orderBy(asc(chapters.position))
    : [];
  const plans = await db.select().from(classChapterPlans).where(and(eq(classChapterPlans.classId, classId), eq(classChapterPlans.schoolId, schoolId)));
  const planByChapter = new Map(plans.map((row) => [row.chapterId, row]));

  const weekday = schoolWeekday(now);
  const date = now.toISOString().slice(0, 10);
  const slots = await db.select().from(timeSlots).where(and(eq(timeSlots.schoolId, schoolId), eq(timeSlots.dayOfWeek, weekday)));
  const entries = slots.length
    ? await db
        .select()
        .from(timetables)
        .where(and(eq(timetables.classId, classId), eq(timetables.teacherId, teacherId), eq(timetables.schoolId, schoolId)))
    : [];
  const todayEntry = entries.find((row) => slots.some((slot) => slot.id === row.timeSlotId));
  const todaySlot = todayEntry ? slots.find((slot) => slot.id === todayEntry.timeSlotId) : undefined;
  const roomLabel = todaySlot?.room ? `salle ${todaySlot.room.replace(/^Salle\s*/i, '')}` : null;

  let paceCovered = 0;
  let paceTotal = 0;
  let paceExpected = 0;
  const chaptersOut: ProgrammeChapter[] = [];

  for (const [index, chapter] of chapterRows.entries()) {
    const plan = planByChapter.get(chapter.id);
    const status = plan?.status ?? 'upcoming';
    const notionRows = await db.select().from(notions).where(eq(notions.chapterId, chapter.id));
    const coveredRows = await db
      .select()
      .from(notionCoverage)
      .where(and(eq(notionCoverage.classId, classId), eq(notionCoverage.schoolId, schoolId)));
    const coveredIds = new Set(coveredRows.map((row) => row.notionId));
    const total = notionRows.length;
    const covered = notionRows.filter((row) => coveredIds.has(row.id)).length;
    const expected =
      week && plan
        ? expectedNotionsAtWeek(week, total, plan.plannedWeekStart, plan.plannedWeekEnd, weeks)
        : 0;

    if (status === 'current') {
      paceCovered = covered;
      paceTotal = total;
      paceExpected = expected;
    }

    const notionsOut: ProgrammeNotion[] =
      status === 'current'
        ? notionRows.map((notion, notionIndex) => ({
            id: notion.id,
            title: notion.title,
            covered: coveredIds.has(notion.id),
            hint: coveredIds.has(notion.id)
              ? undefined
              : notionIndex === covered
                ? "Suggérée par le cours d'aujourd'hui"
                : plan?.plannedWeekEnd
                  ? `Prévue S${plan.plannedWeekEnd}`
                  : undefined,
          }))
        : [];

    chaptersOut.push({
      id: chapter.id,
      index: index + 1,
      title: chapter.title,
      weekLabel: weekLabel(plan?.plannedWeekStart ?? null, plan?.plannedWeekEnd ?? null),
      status,
      stateLabel: stateLabel(status, covered, total, expected),
      notions: notionsOut,
    });
  }

  const behind = Math.max(0, paceExpected - paceCovered);
  const remaining = Math.max(0, paceTotal - paceCovered);
  const weeksLeft = week ? Math.max(1, weeks - week) : weeks;
  const perWeek = remaining > 0 ? Math.round((remaining / weeksLeft) * 100) / 100 : 0;

  return {
    classId,
    className: classRow?.name ?? classId,
    subjectName: assignment.subjectName,
    studentCount: enrollments.length,
    roomLabel,
    termName: term?.name ?? null,
    week,
    weeks,
    chapters: chaptersOut,
    pace: {
      covered: paceCovered,
      total: paceTotal,
      expected: paceExpected,
      behind,
      remaining,
      weeksLeft,
      perWeek,
    },
  };
}
