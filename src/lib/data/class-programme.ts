import 'server-only';

import { and, asc, count, eq, inArray } from 'drizzle-orm';

import {
  chapters,
  classChapterPlans,
  classes,
  notionCoverage,
  notions,
  programmes,
  schools,
  studentEnrollments,
  subjects,
  teacherClasses,
  timeSlots,
  timetables,
} from '@/db/schema';
import type { Database } from '@/lib/db';

import {
  DEFAULT_SCHOOL_TIME_ZONE,
  expectedNotionsAtWeek,
  schoolClockHm,
  schoolDate,
  schoolWeekday,
  termWeekCount,
} from './teacher-home-math';
import { getAcademicContext } from './academic-context';
import { termWeek } from './teacher-home';

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

export type ClassHeader = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  studentCount: number;
  roomLabel: string | null;
  termName: string | null;
  week: number | null;
  weeks: number;
};

export type ClassProgramme = ClassHeader & {
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

/** The class space header: the access check, then name, students, room and week. Every class tab shares it. */
export async function getClassHeader(
  db: Database,
  teacherId: string,
  schoolId: string,
  classId: string,
  subjectId: string,
  now = new Date(),
): Promise<(ClassHeader & { classRow: typeof classes.$inferSelect; timeZone: string }) | null> {
  // Access check and subject name in one query: the assignment, its class and its subject all in this school.
  const [assignment] = await db
    .select({ subjectId: teacherClasses.subjectId, subjectName: subjects.name })
    .from(teacherClasses)
    .innerJoin(classes, and(eq(classes.id, teacherClasses.classId), eq(classes.schoolId, schoolId)))
    .innerJoin(subjects, and(eq(subjects.id, teacherClasses.subjectId), eq(subjects.schoolId, schoolId)))
    .where(
      and(
        eq(teacherClasses.teacherId, teacherId),
        eq(teacherClasses.classId, classId),
        eq(teacherClasses.subjectId, subjectId),
        eq(teacherClasses.schoolId, schoolId),
      ),
    )
    .limit(1);
  if (!assignment) return null;

  const [school] = await db.select({ timeZone: schools.timeZone }).from(schools).where(eq(schools.id, schoolId)).limit(1);
  const timeZone = school?.timeZone || DEFAULT_SCHOOL_TIME_ZONE;
  const [classRow] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)));
  if (!classRow) return null;
  const [enrollmentCount] = await db
    .select({ count: count() })
    .from(studentEnrollments)
    .where(and(eq(studentEnrollments.classId, classId), eq(studentEnrollments.schoolId, schoolId), eq(studentEnrollments.isActive, true)));

  // The class's own year (D40), so an archived class keeps its own terms.
  const { term } = classRow.academicYearId
    ? await getAcademicContext(db, schoolId, { day: schoolDate(now, timeZone), yearId: classRow.academicYearId })
    : { term: null };
  const weeks = term ? termWeekCount(term.startsOn, term.endsOn) : 12;
  const week = term ? termWeek(now, term.startsOn, weeks) : null;

  const weekday = schoolWeekday(now, timeZone);
  const hm = schoolClockHm(now, timeZone);
  const slots = await db.select().from(timeSlots).where(and(eq(timeSlots.schoolId, schoolId), eq(timeSlots.dayOfWeek, weekday)));
  const slotIds = slots.map((slot) => slot.id);
  const entries = slotIds.length
    ? await db
        .select()
        .from(timetables)
        .where(
          and(
            eq(timetables.classId, classId),
            eq(timetables.subjectId, subjectId),
            eq(timetables.teacherId, teacherId),
            eq(timetables.schoolId, schoolId),
            eq(timetables.academicYear, classRow.academicYear),
            eq(timetables.status, 'active'),
            inArray(timetables.timeSlotId, slotIds),
          ),
        )
    : [];
  const liveOrNext = entries
    .map((entry) => {
      const slot = slots.find((row) => row.id === entry.timeSlotId);
      return slot ? { entry, slot } : null;
    })
    .filter((row): row is { entry: (typeof entries)[number]; slot: (typeof slots)[number] } => Boolean(row))
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime))
    .find((row) => hm < row.slot.endTime) ?? entries
    .map((entry) => {
      const slot = slots.find((row) => row.id === entry.timeSlotId);
      return slot ? { entry, slot } : null;
    })
    .filter((row): row is { entry: (typeof entries)[number]; slot: (typeof slots)[number] } => Boolean(row))[0];
  const roomLabel = liveOrNext?.entry.room
    ? `salle ${liveOrNext.entry.room.replace(/^Salle\s*/i, '')}`
    : null;

  return {
    classId,
    className: classRow.name,
    subjectId: assignment.subjectId,
    subjectName: assignment.subjectName,
    studentCount: enrollmentCount.count,
    roomLabel,
    termName: term?.name ?? null,
    week,
    weeks,
    classRow,
    timeZone,
  };
}

export async function getClassProgramme(
  db: Database,
  teacherId: string,
  schoolId: string,
  classId: string,
  subjectId: string,
  now = new Date(),
): Promise<ClassProgramme | null> {
  const header = await getClassHeader(db, teacherId, schoolId, classId, subjectId, now);
  if (!header) return null;
  const { classRow, ...shown } = header;
  const { week, weeks } = shown;

  const [programme] = await db
    .select()
    .from(programmes)
    .where(and(eq(programmes.schoolId, schoolId), eq(programmes.subjectId, subjectId), eq(programmes.levelId, classRow.levelId)))
    .limit(1);
  const chapterRows = programme
    ? await db.select().from(chapters).where(and(eq(chapters.schoolId, schoolId), eq(chapters.programmeId, programme.id))).orderBy(asc(chapters.position))
    : [];
  const plans = await db
    .select()
    .from(classChapterPlans)
    .where(
      and(
        eq(classChapterPlans.classId, classId),
        eq(classChapterPlans.subjectId, subjectId),
        eq(classChapterPlans.schoolId, schoolId),
      ),
    );
  const planByChapter = new Map(plans.map((row) => [row.chapterId, row]));


  const chapterIds = chapterRows.map((row) => row.id);
  const notionRows = chapterIds.length
    ? await db.select().from(notions).where(and(eq(notions.schoolId, schoolId), inArray(notions.chapterId, chapterIds))).orderBy(asc(notions.position))
    : [];
  const notionsByChapter = new Map<string, typeof notionRows>();
  for (const notion of notionRows) {
    const list = notionsByChapter.get(notion.chapterId) ?? [];
    list.push(notion);
    notionsByChapter.set(notion.chapterId, list);
  }
  const coveredRows = await db
    .select()
    .from(notionCoverage)
    .where(
      and(
        eq(notionCoverage.classId, classId),
        eq(notionCoverage.subjectId, subjectId),
        eq(notionCoverage.schoolId, schoolId),
      ),
    );
  const coveredIds = new Set(coveredRows.map((row) => row.notionId));

  let paceCovered = 0;
  let paceTotal = 0;
  let paceExpected = 0;
  const chaptersOut: ProgrammeChapter[] = [];

  for (const [index, chapter] of chapterRows.entries()) {
    const plan = planByChapter.get(chapter.id);
    const status = plan?.status ?? 'upcoming';
    const chapterNotions = notionsByChapter.get(chapter.id) ?? [];
    const total = chapterNotions.length;
    const covered = chapterNotions.filter((row) => coveredIds.has(row.id)).length;
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
        ? chapterNotions.map((notion, notionIndex) => ({
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
    ...shown,
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
