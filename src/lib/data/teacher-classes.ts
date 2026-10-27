import 'server-only';

import { and, eq, inArray, sql } from 'drizzle-orm';

import { academicLevels, classes, studentEnrollments, subjects, teacherClasses } from '@/db/schema';
import type { Database } from '@/lib/db';

export type TeacherClassRow = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  studentCount: number;
};

export async function listTeacherClasses(db: Database, teacherId: string, schoolId: string): Promise<TeacherClassRow[]> {
  const assigned = await db
    .select({
      classId: classes.id,
      className: classes.name,
      subjectId: subjects.id,
      subjectName: subjects.name,
      academicYear: classes.academicYear,
    })
    .from(teacherClasses)
    .innerJoin(classes, eq(teacherClasses.classId, classes.id))
    .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
    .innerJoin(academicLevels, eq(classes.levelId, academicLevels.id))
    .where(and(eq(teacherClasses.teacherId, teacherId), eq(teacherClasses.schoolId, schoolId)))
    .orderBy(classes.name);

  const classIds = assigned.map((row) => row.classId);
  if (classIds.length === 0) return [];

  const counts = await db
    .select({ classId: studentEnrollments.classId, count: sql<number>`count(*)` })
    .from(studentEnrollments)
    .where(and(inArray(studentEnrollments.classId, classIds), eq(studentEnrollments.isActive, true), eq(studentEnrollments.schoolId, schoolId)))
    .groupBy(studentEnrollments.classId);
  const countMap = new Map(counts.map((row) => [row.classId, Number(row.count)]));

  return assigned.map((row) => ({
    ...row,
    studentCount: countMap.get(row.classId) ?? 0,
  }));
}

export async function teacherTeachesClass(db: Database, teacherId: string, schoolId: string, classId: string) {
  const [row] = await db
    .select({ classId: teacherClasses.classId })
    .from(teacherClasses)
    .where(and(eq(teacherClasses.teacherId, teacherId), eq(teacherClasses.schoolId, schoolId), eq(teacherClasses.classId, classId)))
    .limit(1);
  return Boolean(row);
}
