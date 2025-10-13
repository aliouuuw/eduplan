// Auto-Scheduler Engine for Intelligent Timetable Generation
// Subject-First Strategy: Prioritizes placing subjects with highest weekly hours first

export interface Class {
  id: string;
  name: string;
  academicYear: string;
}

export interface Subject {
  id: string;
  name: string;
  weeklyHours: number;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
}

export interface TeacherAssignment {
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
}

export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface ExistingTimetableEntry {
  id?: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  timeSlotId: string;
  status: 'draft' | 'active';
  academicYear: string;
}

export interface SchedulerConstraints {
  classId: string;
  subjects: Subject[];
  teachers: Teacher[];
  teacherAssignments: TeacherAssignment[];
  teacherAvailability: AvailabilitySlot[];
  timeSlots: TimeSlot[];
  existingTimetable?: ExistingTimetableEntry[];
  preserveExisting?: boolean;
}

export interface Conflict {
  type: 'teacher_double_booked' | 'teacher_unavailable' | 'subject_quota_exceeded' | 'no_teacher_available';
  message: string;
  subjectId: string;
  timeSlotId?: string;
  teacherId?: string;
  details?: any;
}

export interface MultiTeacherOption {
  subjectId: string;
  timeSlotId: string;
  teachers: {
    teacherId: string;
    teacherName: string;
    reason: 'available' | 'preferred';
  }[];
}

export interface SchedulerResult {
  success: boolean;
  timetable: TimetableEntry[];
  conflicts: Conflict[];
  multiTeacherSlots: MultiTeacherOption[];
  statistics: {
    totalSlotsNeeded: number;
    slotsPlaced: number;
    slotsConflicted: number;
    subjectsPlaced: number;
    totalSubjects: number;
  };
  distribution?: {
    [subjectId: string]: {
      subjectName: string;
      totalHours: number;
      byDay: { [day: number]: number };
      isBalanced: boolean;
    };
  };
}

export interface TimetableEntry {
  classId: string;
  subjectId: string;
  teacherId: string;
  timeSlotId: string;
  academicYear: string;
  status: 'draft';
}

/**
 * Main scheduling function using subject-first strategy
 */
export function generateScheduleForClass(constraints: SchedulerConstraints): SchedulerResult {
  const {
    classId,
    subjects,
    teacherAssignments,
    teacherAvailability,
    timeSlots,
    existingTimetable = [],
    preserveExisting = false,
  } = constraints;

  // Initialize result
  const result: SchedulerResult = {
    success: false,
    timetable: [],
    conflicts: [],
    multiTeacherSlots: [],
    statistics: {
      totalSlotsNeeded: 0,
      slotsPlaced: 0,
      slotsConflicted: 0,
      subjectsPlaced: 0,
      totalSubjects: subjects.length,
    },
  };

  // Step 1: Calculate total slots needed
  const totalHoursNeeded = subjects.reduce((sum, subject) => sum + subject.weeklyHours, 0);
  const teachingSlots = timeSlots.filter(slot => !slot.isBreak);
  result.statistics.totalSlotsNeeded = totalHoursNeeded;

  // Step 2: Group assignments by subject
  const assignmentsBySubject = new Map<string, TeacherAssignment[]>();
  teacherAssignments.forEach(assignment => {
    if (!assignmentsBySubject.has(assignment.subjectId)) {
      assignmentsBySubject.set(assignment.subjectId, []);
    }
    assignmentsBySubject.get(assignment.subjectId)!.push(assignment);
  });

  // Step 3: Sort subjects by priority (highest weekly hours first, then fewest teachers)
  const sortedSubjects = subjects
    .filter(subject => subject.weeklyHours > 0) // Only subjects with hours
    .sort((a, b) => {
      // Primary: More weekly hours first
      if (a.weeklyHours !== b.weeklyHours) {
        return b.weeklyHours - a.weeklyHours;
      }
      // Secondary: Fewer available teachers (more constrained)
      const aTeachers = assignmentsBySubject.get(a.id)?.length || 0;
      const bTeachers = assignmentsBySubject.get(b.id)?.length || 0;
      return aTeachers - bTeachers;
    });

  // Step 4: Track used slots, teacher availability, and subject distribution
  const usedSlots = new Set<string>();
  const teacherSchedule = new Map<string, Set<string>>(); // teacherId -> Set<timeSlotId>
  const subjectDistribution = new Map<string, Map<number, number>>(); // subjectId -> day -> count

  // Initialize teacher schedules and subject distribution
  teacherAssignments.forEach(assignment => {
    if (!teacherSchedule.has(assignment.teacherId)) {
      teacherSchedule.set(assignment.teacherId, new Set());
    }
  });

  subjects.forEach(subject => {
    subjectDistribution.set(subject.id, new Map());
  });

  // If preserving existing, mark those slots as used
  if (preserveExisting && existingTimetable.length > 0) {
    existingTimetable.forEach(entry => {
      usedSlots.add(entry.timeSlotId);
      if (!teacherSchedule.has(entry.teacherId)) {
        teacherSchedule.set(entry.teacherId, new Set());
      }
      teacherSchedule.get(entry.teacherId)!.add(entry.timeSlotId);
      // Convert to TimetableEntry format with draft status
      const timetableEntry: TimetableEntry = {
        classId: entry.classId,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        timeSlotId: entry.timeSlotId,
        academicYear: entry.academicYear,
        status: 'draft' as const,
      };
      result.timetable.push(timetableEntry);
      result.statistics.slotsPlaced++;
    });
  }

  // Step 5: Place subjects iteratively
  for (const subject of sortedSubjects) {
    const assignments = assignmentsBySubject.get(subject.id) || [];
    if (assignments.length === 0) {
      result.conflicts.push({
        type: 'no_teacher_available',
        message: `No teacher assigned to ${subject.name}`,
        subjectId: subject.id,
      });
      continue;
    }

    let hoursPlaced = 0;
    const maxHours = subject.weeklyHours;

    // Find valid slots for this subject with balanced distribution
    const validSlots = findValidSlotsForSubject(
      subject,
      assignments,
      teachingSlots,
      teacherAvailability,
      usedSlots,
      teacherSchedule,
      subjectDistribution,
      result.timetable
    );

    // Distribute hours across the week
    for (const slot of validSlots) {
      if (hoursPlaced >= maxHours) break;

      // Find available teachers for this slot
      const availableTeachers = assignments.filter(assignment =>
        isTeacherAvailableForSlot(assignment.teacherId, slot, teacherAvailability, teacherSchedule)
      );

      if (availableTeachers.length === 0) {
        result.conflicts.push({
          type: 'no_teacher_available',
          message: `No teacher available for ${subject.name} at ${slot.startTime}-${slot.endTime} on ${getDayName(slot.dayOfWeek)}`,
          subjectId: subject.id,
          timeSlotId: slot.id,
        });
        result.statistics.slotsConflicted++;
        continue;
      }

      let selectedTeacher: TeacherAssignment;

      if (availableTeachers.length === 1) {
        // Only one teacher available
        selectedTeacher = availableTeachers[0];
      } else {
        // Multiple teachers available - add to multi-teacher options
        const multiOption: MultiTeacherOption = {
          subjectId: subject.id,
          timeSlotId: slot.id,
          teachers: availableTeachers.map(assignment => ({
            teacherId: assignment.teacherId,
            teacherName: assignment.teacherName,
            reason: 'available' as const,
          })),
        };
        result.multiTeacherSlots.push(multiOption);

        // For now, select the first teacher (admin can change later)
        selectedTeacher = availableTeachers[0];
      }

      // Create timetable entry
      const entry: TimetableEntry = {
        classId,
        subjectId: subject.id,
        teacherId: selectedTeacher.teacherId,
        timeSlotId: slot.id,
        academicYear: constraints.classId.split('-')[1] || '2025-2026', // Extract from class ID or default
        status: 'draft',
      };

      result.timetable.push(entry);
      usedSlots.add(slot.id);
      teacherSchedule.get(selectedTeacher.teacherId)!.add(slot.id);
      
      // Track distribution
      const dayMap = subjectDistribution.get(subject.id)!;
      dayMap.set(slot.dayOfWeek, (dayMap.get(slot.dayOfWeek) || 0) + 1);
      
      hoursPlaced++;
      result.statistics.slotsPlaced++;
    }

    if (hoursPlaced > 0) {
      result.statistics.subjectsPlaced++;
    } else {
      result.conflicts.push({
        type: 'subject_quota_exceeded',
        message: `Could not place any hours for ${subject.name} (${maxHours} hours required)`,
        subjectId: subject.id,
      });
    }

    if (hoursPlaced < maxHours) {
      result.conflicts.push({
        type: 'subject_quota_exceeded',
        message: `Only placed ${hoursPlaced}/${maxHours} hours for ${subject.name}`,
        subjectId: subject.id,
      });
    }
  }

  // Step 6: Calculate distribution metrics
  result.distribution = calculateDistributionMetrics(subjects, subjectDistribution, result.timetable);

  // Step 7: Final validation and success determination
  result.success = result.conflicts.length === 0 &&
                   result.statistics.subjectsPlaced === result.statistics.totalSubjects &&
                   result.statistics.slotsPlaced >= result.statistics.totalSlotsNeeded * 0.8; // At least 80% success rate

  return result;
}

/**
 * Find valid time slots for a subject considering teacher availability, conflicts, and balanced distribution
 */
function findValidSlotsForSubject(
  subject: Subject,
  assignments: TeacherAssignment[],
  allSlots: TimeSlot[],
  teacherAvailability: AvailabilitySlot[],
  usedSlots: Set<string>,
  teacherSchedule: Map<string, Set<string>>,
  subjectDistribution: Map<string, Map<number, number>>,
  currentTimetable: TimetableEntry[]
): TimeSlot[] {
  const validSlots: TimeSlot[] = [];

  // Get all available slots (not used and not breaks)
  const availableSlots = allSlots.filter(slot => !slot.isBreak && !usedSlots.has(slot.id));

  // Get current distribution for this subject
  const currentDistribution = subjectDistribution.get(subject.id) || new Map();

  for (const slot of availableSlots) {
    // Check if any assigned teacher is available for this slot
    const hasAvailableTeacher = assignments.some(assignment =>
      isTeacherAvailableForSlot(assignment.teacherId, slot, teacherAvailability, teacherSchedule)
    );

    if (hasAvailableTeacher) {
      // Calculate a score for this slot based on distribution balance
      const dayCount = currentDistribution.get(slot.dayOfWeek) || 0;
      const consecutiveScore = calculateConsecutiveScore(slot, subject.id, currentTimetable);
      
      validSlots.push(slot);
    }
  }

  // Sort by balanced distribution: prefer days with fewer sessions, then by time
  return validSlots.sort((a, b) => {
    const dayCountA = currentDistribution.get(a.dayOfWeek) || 0;
    const dayCountB = currentDistribution.get(b.dayOfWeek) || 0;

    // Primary: Prefer days with fewer sessions of this subject
    if (dayCountA !== dayCountB) {
      return dayCountA - dayCountB;
    }

    // Secondary: Avoid consecutive slots (check if previous or next slot has same subject)
    const consecutiveScoreA = calculateConsecutiveScore(a, subject.id, currentTimetable);
    const consecutiveScoreB = calculateConsecutiveScore(b, subject.id, currentTimetable);
    
    if (consecutiveScoreA !== consecutiveScoreB) {
      return consecutiveScoreA - consecutiveScoreB; // Lower score is better (fewer consecutive)
    }

    // Tertiary: Spread across different days
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }

    // Final: Sort by time
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Calculate how many consecutive slots this subject would create
 * Lower score is better (fewer consecutive slots)
 */
function calculateConsecutiveScore(
  slot: TimeSlot,
  subjectId: string,
  currentTimetable: TimetableEntry[]
): number {
  let score = 0;

  // Find entries on the same day
  const sameDayEntries = currentTimetable.filter(entry => {
    const entrySlot = entry.timeSlotId;
    return entry.subjectId === subjectId;
  });

  // Check if there's a slot immediately before or after (simplified - would need slot time info)
  // For now, we'll just count if there are already entries for this subject on this day
  const sameDaySubjectCount = sameDayEntries.filter(entry => {
    // This is a simplified check - in production you'd compare actual times
    return true;
  }).length;

  return sameDaySubjectCount; // More entries on this day = higher score = less preferred
}

/**
 * Check if a teacher is available for a specific time slot
 */
function isTeacherAvailableForSlot(
  teacherId: string,
  slot: TimeSlot,
  teacherAvailability: AvailabilitySlot[],
  teacherSchedule: Map<string, Set<string>>
): boolean {
  // Check if teacher is already scheduled for this slot
  const teacherSlots = teacherSchedule.get(teacherId);
  if (teacherSlots?.has(slot.id)) {
    return false; // Double-booked
  }

  // Check teacher availability for this day and time
  const dayAvailability = teacherAvailability.filter(
    avail => avail.teacherId === teacherId && avail.dayOfWeek === slot.dayOfWeek
  );

  return dayAvailability.some(avail =>
    slot.startTime >= avail.startTime && slot.endTime <= avail.endTime
  );
}

/**
 * Utility function to get day name from number
 */
function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek - 1] || 'Unknown';
}

/**
 * Calculate distribution metrics for each subject
 */
function calculateDistributionMetrics(
  subjects: Subject[],
  subjectDistribution: Map<string, Map<number, number>>,
  timetable: TimetableEntry[]
): { [subjectId: string]: { subjectName: string; totalHours: number; byDay: { [day: number]: number }; isBalanced: boolean } } {
  const result: any = {};

  subjects.forEach(subject => {
    const dayMap = subjectDistribution.get(subject.id) || new Map();
    const byDay: { [day: number]: number } = {};
    let totalHours = 0;

    // Convert Map to object
    dayMap.forEach((count, day) => {
      byDay[day] = count;
      totalHours += count;
    });

    // Check if balanced: no single day should have more than 50% of total hours
    const maxDayCount = Math.max(...Object.values(byDay), 0);
    const isBalanced = totalHours === 0 || maxDayCount <= Math.ceil(totalHours / 2);

    result[subject.id] = {
      subjectName: subject.name,
      totalHours,
      byDay,
      isBalanced,
    };
  });

  return result;
}

/**
 * Resolve multi-teacher selections by applying admin choices
 */
export function resolveMultiTeacherSelections(
  result: SchedulerResult,
  selections: { [timeSlotId: string]: string } // timeSlotId -> teacherId
): SchedulerResult {
  const resolvedResult = { ...result };

  // Update timetable entries based on selections
  resolvedResult.timetable = result.timetable.map(entry => {
    const selection = selections[entry.timeSlotId];
    if (selection && selection !== entry.teacherId) {
      return { ...entry, teacherId: selection };
    }
    return entry;
  });

  // Remove resolved multi-teacher options
  resolvedResult.multiTeacherSlots = result.multiTeacherSlots.filter(
    option => !selections[option.timeSlotId]
  );

  return resolvedResult;
}
