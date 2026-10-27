import { teacherClasses, teacherSubjects, teacherAvailability, users, subjects, classes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Comprehensive teacher metrics and utilities
 * Combines workload, availability, qualifications, and capacity
 */

export interface TeacherAvailabilitySlot {
  id: string;
  dayOfWeek: number; // 1-7 (Monday-Sunday)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  isRecurring: boolean;
  notes?: string;
}

export interface TeacherAssignment {
  assignmentId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number;
  academicYear: string;
}

export interface TeacherQualification {
  qualificationId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
}

export interface TeacherMetrics {
  // Identity
  teacherId: string;
  teacherName: string;
  teacherEmail: string;

  // Workload (current assignments)
  workload: {
    totalWeeklyHours: number;
    assignmentCount: number;
    classCount: number;
    assignments: TeacherAssignment[];
  };

  // Availability (time slots when teacher can teach)
  availability: {
    totalWeeklyMinutes: number;
    totalWeeklyHours: number; // Converted from minutes
    slotCount: number;
    slots: TeacherAvailabilitySlot[];
    hasAvailability: boolean;
  };

  // Capacity analysis
  capacity: {
    availableHours: number; // availability - workload
    utilizationPercentage: number; // (workload / availability) * 100
    isOverallocated: boolean; // workload > availability
    canAcceptMoreHours: number; // Max hours that can still be assigned
  };

  // Qualifications
  qualifications: {
    count: number;
    subjects: TeacherQualification[];
  };
}

/**
 * Calculate duration in minutes from HH:MM time strings
 */
function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
}

/**
 * Get comprehensive teacher metrics including workload, availability, and capacity
 */
export async function getTeacherMetrics(
  teacherId: string,
  schoolId: string
): Promise<TeacherMetrics> {
  const { db } = await import('@/lib/db');

  // Get teacher info
  const teacher = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.id, teacherId), eq(users.schoolId, schoolId)))
    .limit(1);

  if (teacher.length === 0) {
    throw new Error('Teacher not found');
  }

  const [assignments, availabilitySlots, qualifications] = await Promise.all([
    db
      .select({
        assignmentId: teacherClasses.id,
        classId: classes.id,
        className: classes.name,
        subjectId: subjects.id,
        subjectName: subjects.name,
        weeklyHours: teacherClasses.weeklyHours,
        academicYear: classes.academicYear,
      })
      .from(teacherClasses)
      .innerJoin(classes, eq(teacherClasses.classId, classes.id))
      .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
      .where(
        and(
          eq(teacherClasses.teacherId, teacherId),
          eq(teacherClasses.schoolId, schoolId)
        )
      ),
    db
      .select()
      .from(teacherAvailability)
      .where(
        and(
          eq(teacherAvailability.teacherId, teacherId),
          eq(teacherAvailability.schoolId, schoolId)
        )
      ),
    db
      .select({
        qualificationId: teacherSubjects.id,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherSubjects)
      .innerJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
      .where(
        and(
          eq(teacherSubjects.teacherId, teacherId),
          eq(teacherSubjects.schoolId, schoolId)
        )
      ),
  ]);

  const totalWeeklyHours = assignments.reduce((sum, a) => sum + (a.weeklyHours || 0), 0);
  const uniqueClasses = new Set(assignments.map(a => a.classId)).size;

  const slots: TeacherAvailabilitySlot[] = availabilitySlots.map(slot => ({
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationMinutes: calculateDurationMinutes(slot.startTime, slot.endTime),
    isRecurring: slot.isRecurring || false,
    notes: slot.notes || undefined,
  }));

  const totalAvailabilityMinutes = slots.reduce((sum, slot) => sum + slot.durationMinutes, 0);
  const totalAvailabilityHours = Math.round((totalAvailabilityMinutes / 60) * 100) / 100; // Round to 2 decimals

  // Calculate Capacity
  const availableHours = totalAvailabilityHours - totalWeeklyHours;
  const utilizationPercentage = totalAvailabilityHours > 0 
    ? Math.round((totalWeeklyHours / totalAvailabilityHours) * 100)
    : 0;
  const isOverallocated = totalWeeklyHours > totalAvailabilityHours;
  const canAcceptMoreHours = Math.max(0, availableHours);

  return {
    teacherId: teacher[0].id,
    teacherName: teacher[0].name,
    teacherEmail: teacher[0].email,
    workload: {
      totalWeeklyHours,
      assignmentCount: assignments.length,
      classCount: uniqueClasses,
      assignments: assignments.map(a => ({
        assignmentId: a.assignmentId,
        classId: a.classId,
        className: a.className,
        subjectId: a.subjectId,
        subjectName: a.subjectName,
        weeklyHours: a.weeklyHours || 0,
        academicYear: a.academicYear,
      })),
    },
    availability: {
      totalWeeklyMinutes: totalAvailabilityMinutes,
      totalWeeklyHours: totalAvailabilityHours,
      slotCount: slots.length,
      slots,
      hasAvailability: slots.length > 0,
    },
    capacity: {
      availableHours,
      utilizationPercentage,
      isOverallocated,
      canAcceptMoreHours,
    },
    qualifications: {
      count: qualifications.length,
      subjects: qualifications.map(q => ({
        qualificationId: q.qualificationId,
        subjectId: q.subjectId,
        subjectName: q.subjectName,
        subjectCode: q.subjectCode,
      })),
    },
  };
}

/**
 * Check if a teacher has availability conflicts with proposed assignment
 * This is a placeholder for future timetable integration
 */
export async function hasAvailabilityConflict(
  teacherId: string,
  schoolId: string,
  proposedHours: number
): Promise<boolean> {
  // Note: getTeacherMetrics already handles the db import lazily
  const metrics = await getTeacherMetrics(teacherId, schoolId);
  
  // Simple check: Would this assignment exceed available capacity?
  const newTotal = metrics.workload.totalWeeklyHours + proposedHours;
  return newTotal > metrics.availability.totalWeeklyHours;
}

/**
 * Teachers in a school whose open hours are above zero.
 * Same rule as the subjects list: availability hours minus assigned hours.
 * One pass for the school. The list page used to repeat this per subject.
 */
export async function countTeachersWithOpenCapacity(schoolId: string): Promise<number> {
  const { db } = await import('@/lib/db');

  const [teacherRows, assignmentRows, slotRows] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, 'teacher'))),
    db
      .select({
        teacherId: teacherClasses.teacherId,
        weeklyHours: teacherClasses.weeklyHours,
      })
      .from(teacherClasses)
      .where(eq(teacherClasses.schoolId, schoolId)),
    db
      .select({
        teacherId: teacherAvailability.teacherId,
        startTime: teacherAvailability.startTime,
        endTime: teacherAvailability.endTime,
      })
      .from(teacherAvailability)
      .where(eq(teacherAvailability.schoolId, schoolId)),
  ]);

  const workloadHours = new Map<string, number>();
  for (const row of assignmentRows) {
    workloadHours.set(row.teacherId, (workloadHours.get(row.teacherId) ?? 0) + (row.weeklyHours || 0));
  }

  const availabilityMinutes = new Map<string, number>();
  for (const row of slotRows) {
    const minutes = calculateDurationMinutes(row.startTime, row.endTime);
    availabilityMinutes.set(row.teacherId, (availabilityMinutes.get(row.teacherId) ?? 0) + minutes);
  }

  let openCount = 0;
  for (const teacher of teacherRows) {
    const availabilityHours = Math.round(((availabilityMinutes.get(teacher.id) ?? 0) / 60) * 100) / 100;
    const openHours = availabilityHours - (workloadHours.get(teacher.id) ?? 0);
    if (openHours > 0) openCount += 1;
  }

  return openCount;
}

/**
 * Get teachers with availability for assignment (sorted by capacity)
 */
export async function getAvailableTeachersForAssignment(
  schoolId: string,
  subjectId?: string
): Promise<Array<TeacherMetrics & { isQualified: boolean }>> {
  const { db } = await import('@/lib/db');

  const [teachers, qualified] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, 'teacher'))),
    subjectId
      ? db
          .select({ teacherId: teacherSubjects.teacherId })
          .from(teacherSubjects)
          .where(
            and(
              eq(teacherSubjects.subjectId, subjectId),
              eq(teacherSubjects.schoolId, schoolId)
            )
          )
      : Promise.resolve([]),
  ]);

  const qualifiedTeacherIds = new Set(qualified.map(q => q.teacherId));

  // Get metrics for each teacher
  const teachersWithMetrics = await Promise.all(
    teachers.map(async (teacher) => {
      const metrics = await getTeacherMetrics(teacher.id, schoolId);
      return {
        ...metrics,
        isQualified: subjectId ? qualifiedTeacherIds.has(teacher.id) : true,
      };
    })
  );

  // Sort: qualified first, then by available capacity
  teachersWithMetrics.sort((a, b) => {
    if (a.isQualified && !b.isQualified) return -1;
    if (!a.isQualified && b.isQualified) return 1;
    return b.capacity.availableHours - a.capacity.availableHours;
  });

  return teachersWithMetrics;
}

