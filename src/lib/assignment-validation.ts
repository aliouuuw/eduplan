import { db } from '@/lib/db';
import { teacherClasses, teacherSubjects, users, subjects, classes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  totalWeeklyHours: number;
  assignmentCount: number;
  classCount: number;
  assignments: Array<{
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    weeklyHours: number;
  }>;
}

export interface ValidationWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

const MAX_WEEKLY_HOURS = 30;
const WARNING_THRESHOLD = 25;

/**
 * Calculate a teacher's total workload across all classes
 */
export async function calculateTeacherWorkload(teacherId: string, schoolId: string): Promise<TeacherWorkload> {
  // Get teacher info
  const teacher = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.id, teacherId), eq(users.schoolId, schoolId)))
    .limit(1);

  if (teacher.length === 0) {
    throw new Error('Teacher not found');
  }

  // Get all class assignments
  const assignments = await db
    .select({
      classId: classes.id,
      className: classes.name,
      subjectId: subjects.id,
      subjectName: subjects.name,
      weeklyHours: teacherClasses.weeklyHours,
    })
    .from(teacherClasses)
    .innerJoin(classes, eq(teacherClasses.classId, classes.id))
    .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
    .where(
      and(
        eq(teacherClasses.teacherId, teacherId),
        eq(teacherClasses.schoolId, schoolId)
      )
    );

  const totalWeeklyHours = assignments.reduce((sum, a) => sum + (a.weeklyHours || 0), 0);
  const uniqueClasses = new Set(assignments.map(a => a.classId)).size;

  return {
    teacherId: teacher[0].id,
    teacherName: teacher[0].name,
    totalWeeklyHours,
    assignmentCount: assignments.length,
    classCount: uniqueClasses,
    assignments: assignments.map(a => ({
      classId: a.classId,
      className: a.className,
      subjectId: a.subjectId,
      subjectName: a.subjectName,
      weeklyHours: a.weeklyHours || 0,
    })),
  };
}

/**
 * Check if a teacher is qualified to teach a subject
 */
export async function isTeacherQualified(
  teacherId: string,
  subjectId: string,
  schoolId: string
): Promise<boolean> {
  const qualification = await db
    .select()
    .from(teacherSubjects)
    .where(
      and(
        eq(teacherSubjects.teacherId, teacherId),
        eq(teacherSubjects.subjectId, subjectId),
        eq(teacherSubjects.schoolId, schoolId)
      )
    )
    .limit(1);

  return qualification.length > 0;
}

/**
 * Validate a teacher assignment and return warnings
 */
export async function validateTeacherAssignment(
  teacherId: string,
  subjectId: string,
  classId: string,
  weeklyHours: number,
  schoolId: string
): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Check qualification
  const qualified = await isTeacherQualified(teacherId, subjectId, schoolId);
  if (!qualified) {
    warnings.push({
      type: 'warning',
      message: 'Teacher is not qualified for this subject',
      details: 'This teacher has not been formally assigned to teach this subject. Consider adding them to the subject qualifications first.',
    });
  }

  // Check workload
  const workload = await calculateTeacherWorkload(teacherId, schoolId);
  const newTotalHours = workload.totalWeeklyHours + weeklyHours;

  if (newTotalHours > MAX_WEEKLY_HOURS) {
    warnings.push({
      type: 'error',
      message: `This assignment exceeds maximum weekly hours (${MAX_WEEKLY_HOURS}h)`,
      details: `Teacher currently has ${workload.totalWeeklyHours}h. Adding ${weeklyHours}h would total ${newTotalHours}h.`,
    });
  } else if (newTotalHours > WARNING_THRESHOLD) {
    warnings.push({
      type: 'warning',
      message: 'High workload detected',
      details: `This assignment will bring total hours to ${newTotalHours}h (near the ${MAX_WEEKLY_HOURS}h limit).`,
    });
  }

  // Check for duplicate assignment
  const existingAssignment = await db
    .select()
    .from(teacherClasses)
    .where(
      and(
        eq(teacherClasses.teacherId, teacherId),
        eq(teacherClasses.classId, classId),
        eq(teacherClasses.subjectId, subjectId),
        eq(teacherClasses.schoolId, schoolId)
      )
    )
    .limit(1);

  if (existingAssignment.length > 0) {
    warnings.push({
      type: 'error',
      message: 'Duplicate assignment',
      details: 'This teacher is already assigned to teach this subject in this class.',
    });
  }

  return warnings;
}

/**
 * Get all teachers qualified for a specific subject
 */
export async function getQualifiedTeachers(subjectId: string, schoolId: string) {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      qualificationId: teacherSubjects.id,
    })
    .from(teacherSubjects)
    .innerJoin(users, eq(teacherSubjects.teacherId, users.id))
    .where(
      and(
        eq(teacherSubjects.subjectId, subjectId),
        eq(teacherSubjects.schoolId, schoolId),
        eq(users.role, 'teacher')
      )
    );
}

/**
 * Auto-create teacher qualification if it doesn't exist
 */
export async function ensureTeacherQualification(
  teacherId: string,
  subjectId: string,
  schoolId: string
): Promise<{ created: boolean; qualificationId: string }> {
  const existing = await db
    .select()
    .from(teacherSubjects)
    .where(
      and(
        eq(teacherSubjects.teacherId, teacherId),
        eq(teacherSubjects.subjectId, subjectId),
        eq(teacherSubjects.schoolId, schoolId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { created: false, qualificationId: existing[0].id };
  }

  // Create new qualification
  const { generateId } = await import('@/lib/utils');
  const id = generateId();

  await db.insert(teacherSubjects).values({
    id,
    teacherId,
    subjectId,
    schoolId,
    createdAt: new Date(),
  });

  return { created: true, qualificationId: id };
}

