import { db } from '@/lib/db';
import { teacherClasses, teacherSubjects, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTeacherMetrics } from './teacher-utils';
import { activeTeacher } from '@/lib/teacher-scope';

export interface ValidationWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

const MAX_WEEKLY_HOURS = 30;
const WARNING_THRESHOLD = 25;

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
 * Enhanced to check both workload AND availability
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

  // Get comprehensive teacher metrics (workload + availability)
  const metrics = await getTeacherMetrics(teacherId, schoolId);
  const newTotalHours = metrics.workload.totalWeeklyHours + weeklyHours;

  // Check availability capacity FIRST (more important than arbitrary limits)
  if (metrics.availability.hasAvailability) {
    const newAvailableHours = metrics.capacity.availableHours - weeklyHours;
    
    if (newAvailableHours < 0) {
      warnings.push({
        type: 'error',
        message: 'Assignment exceeds teacher availability',
        details: `Teacher has ${metrics.availability.totalWeeklyHours}h available. Current workload: ${metrics.workload.totalWeeklyHours}h. Adding ${weeklyHours}h would exceed capacity by ${Math.abs(newAvailableHours)}h.`,
      });
    } else if (newAvailableHours < 2) {
      warnings.push({
        type: 'warning',
        message: 'Near capacity',
        details: `This assignment would leave only ${newAvailableHours}h of available time remaining.`,
      });
    }

    // Show capacity utilization info
    const newUtilization = Math.round((newTotalHours / metrics.availability.totalWeeklyHours) * 100);
    if (newUtilization >= 90) {
      warnings.push({
        type: 'info',
        message: `High capacity utilization: ${newUtilization}%`,
        details: `Teacher will be using ${newUtilization}% of their available time slots.`,
      });
    }
  } else {
    // No availability set - fall back to hard limits with warning
    warnings.push({
      type: 'warning',
      message: 'No availability schedule set',
      details: 'This teacher has not set their availability. Consider adding availability slots for better scheduling.',
    });

    // Use legacy hard limits as fallback
    if (newTotalHours > MAX_WEEKLY_HOURS) {
      warnings.push({
        type: 'error',
        message: `Assignment exceeds maximum weekly hours (${MAX_WEEKLY_HOURS}h)`,
        details: `Teacher currently has ${metrics.workload.totalWeeklyHours}h. Adding ${weeklyHours}h would total ${newTotalHours}h.`,
      });
    } else if (newTotalHours > WARNING_THRESHOLD) {
      warnings.push({
        type: 'warning',
        message: 'High workload detected',
        details: `This assignment will bring total hours to ${newTotalHours}h (near the ${MAX_WEEKLY_HOURS}h limit).`,
      });
    }
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
        activeTeacher()
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

