// Auto-Scheduler Engine for Intelligent Timetable Generation
// Subject-First Strategy with configurable distribution and timing preferences

type SchedulerStrategy = 'balanced' | 'morning-heavy' | 'afternoon-heavy';

const SCHEDULER_CONFIG = {
  doublePeriod: {
    minWeeklyHours: 4, // Subjects with 4+ weekly hours eligible for double periods
    probability: 0.6, // 60% chance to create a double period
  },
  distribution: {
    // Subjects with X+ weekly hours should spread across Y+ days
    rules: [
      { weeklyHoursThreshold: 5, targetDays: 3 }, // 5+ hours → 3+ days
      { weeklyHoursThreshold: 3, targetDays: 2 }, // 3+ hours → 2+ days  
      { weeklyHoursThreshold: 1, targetDays: 1 }, // 1+ hours → 1+ day
    ],
  },
  randomization: {
    enabled: true,
    tieBreakSeed: Date.now(),
    jitter: 0.1,
  },
};

interface SingleSlotOption {
  slot: TimeSlot;
  score: number;
  availableTeachers: TeacherAssignment[];
}

interface DoubleSlotOption {
  slots: [TimeSlot, TimeSlot];
  score: number;
  availableTeachers: TeacherAssignment[];
}

function createRandomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(items: T[], random: () => number): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getTargetDistributionDays(weeklyHours: number): number {
  for (const rule of SCHEDULER_CONFIG.distribution.rules) {
    if (weeklyHours >= rule.weeklyHoursThreshold) {
      return rule.targetDays;
    }
  }
  return Math.min(weeklyHours, 1);
}

function getStrategyWeight(slot: TimeSlot, strategy: SchedulerStrategy): number {
  if (strategy === 'morning-heavy') {
    return slot.startTime < '11:00' ? 1.8 : 1;
  }
  if (strategy === 'afternoon-heavy') {
    return slot.startTime >= '13:00' ? 1.8 : 1;
  }
  return 1;
}

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
  strategy?: SchedulerStrategy;
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
    doublePeriodCount: number;
    daysWithClasses: number;
    distributionQuality: number;
  };
  distribution?: {
    [subjectId: string]: {
      subjectName: string;
      totalHours: number;
      byDay: { [day: number]: number };
      uniqueDays: number;
      meetsTarget: boolean;
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
    strategy = 'balanced',
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
      doublePeriodCount: 0,
      daysWithClasses: 0,
      distributionQuality: 0,
    },
  };

  // Step 1: Calculate total slots needed
  const totalHoursNeeded = subjects.reduce((sum, subject) => sum + subject.weeklyHours, 0);
  const teachingSlots = timeSlots.filter(slot => !slot.isBreak);
  const slotLookup = new Map(timeSlots.map(slot => [slot.id, slot]));
  const availableDays = Array.from(new Set(teachingSlots.map(slot => slot.dayOfWeek)));
  result.statistics.totalSlotsNeeded = totalHoursNeeded;

  const random = SCHEDULER_CONFIG.randomization.enabled
    ? createRandomGenerator(SCHEDULER_CONFIG.randomization.tieBreakSeed)
    : () => Math.random();

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
    const subjectTargetDays = getTargetDistributionDays(subject.weeklyHours);
    const initialDistribution = subjectDistribution.get(subject.id) || new Map();
    const usedDays = new Set(initialDistribution.keys());

    const doublePeriodResults = attemptDoublePeriods(
      classId,
      subject,
      assignments,
      teachingSlots,
      teacherAvailability,
      usedSlots,
      teacherSchedule,
      subjectDistribution,
      result.timetable,
      strategy,
      random,
      constraints.classId.split('-')[1] || '2025-2026'
    );

    if (doublePeriodResults.entries.length > 0) {
      result.timetable.push(...doublePeriodResults.entries);
      result.statistics.slotsPlaced += doublePeriodResults.slotsPlaced;
      result.statistics.doublePeriodCount += doublePeriodResults.doublePeriodsPlaced;
      hoursPlaced += doublePeriodResults.slotsPlaced;

      for (const slotId of doublePeriodResults.usedSlotIds) {
        usedSlots.add(slotId);
      }
    }

    const validSlots = findValidSlotsForSubject(
      subject,
      assignments,
      teachingSlots,
      teacherAvailability,
      usedSlots,
      teacherSchedule,
      subjectDistribution,
      result.timetable,
      strategy,
      random,
      subjectTargetDays
    );

    // Distribute hours across the week
    for (const { slot, availableTeachers } of validSlots) {
      if (hoursPlaced >= maxHours) break;

      // Find available teachers for this slot
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
  const targetDaysBySubject = new Map<string, number>();
  sortedSubjects.forEach(subject => {
    targetDaysBySubject.set(subject.id, getTargetDistributionDays(subject.weeklyHours));
  });
  result.distribution = calculateDistributionMetrics(subjects, subjectDistribution, result.timetable, targetDaysBySubject);

  // Step 7: Calculate daily coverage
  const daysWithClasses = ensureDailyCoverage(result.timetable, slotLookup, availableDays);
  result.statistics.daysWithClasses = daysWithClasses.size;

  // Step 8: Calculate distribution quality
  const distributionQuality = calculateDistributionQuality(result.distribution);
  result.statistics.distributionQuality = distributionQuality;

  // Step 9: Final validation and success determination
  result.success = result.conflicts.length === 0 &&
                   result.statistics.subjectsPlaced === result.statistics.totalSubjects &&
                   result.statistics.slotsPlaced >= result.statistics.totalSlotsNeeded * 0.8; // At least 80% success rate

  return result;
}

/**
 * Attempt to place double periods for subjects with sufficient weekly hours
 */
function attemptDoublePeriods(
  classId: string,
  subject: Subject,
  assignments: TeacherAssignment[],
  allSlots: TimeSlot[],
  teacherAvailability: AvailabilitySlot[],
  usedSlots: Set<string>,
  teacherSchedule: Map<string, Set<string>>,
  subjectDistribution: Map<string, Map<number, number>>,
  currentTimetable: TimetableEntry[],
  strategy: SchedulerStrategy,
  random: () => number,
  academicYear: string
): {
  entries: TimetableEntry[];
  slotsPlaced: number;
  doublePeriodsPlaced: number;
  usedSlotIds: string[];
} {
  const result = {
    entries: [] as TimetableEntry[],
    slotsPlaced: 0,
    doublePeriodsPlaced: 0,
    usedSlotIds: [] as string[],
  };

  // Only attempt double periods for subjects with sufficient hours
  if (subject.weeklyHours < SCHEDULER_CONFIG.doublePeriod.minWeeklyHours) {
    return result;
  }

  // Random chance to create double period
  if (random() > SCHEDULER_CONFIG.doublePeriod.probability) {
    return result;
  }

  // Find consecutive slot pairs and score them by strategy
  const consecutivePairs = findConsecutiveSlotPairs(allSlots, usedSlots);
  const scoredPairs: Array<{
    slots: [TimeSlot, TimeSlot];
    score: number;
    teachers: TeacherAssignment[];
  }> = [];

  for (const [slot1, slot2] of consecutivePairs) {
    // Check if both slots are available
    if (usedSlots.has(slot1.id) || usedSlots.has(slot2.id)) continue;

    // Find teachers available for both slots
    const teachersForSlot1 = assignments.filter(assignment =>
      isTeacherAvailableForSlot(assignment.teacherId, slot1, teacherAvailability, teacherSchedule)
    );
    const teachersForSlot2 = assignments.filter(assignment =>
      isTeacherAvailableForSlot(assignment.teacherId, slot2, teacherAvailability, teacherSchedule)
    );

    // Find teachers available for both
    const availableForBoth = teachersForSlot1.filter(t1 =>
      teachersForSlot2.some(t2 => t2.teacherId === t1.teacherId)
    );

    if (availableForBoth.length === 0) continue;

    // Score this double period based on strategy
    const strategyWeight1 = getStrategyWeight(slot1, strategy);
    const strategyWeight2 = getStrategyWeight(slot2, strategy);
    const avgStrategyWeight = (strategyWeight1 + strategyWeight2) / 2;
    const randomBonus = random() * 0.1;
    const score = avgStrategyWeight + randomBonus;

    scoredPairs.push({
      slots: [slot1, slot2],
      score,
      teachers: availableForBoth,
    });
  }

  // Sort by score (highest first) and pick the best
  if (scoredPairs.length === 0) return result;
  
  scoredPairs.sort((a, b) => b.score - a.score);
  const bestPair = scoredPairs[0];
  const [slot1, slot2] = bestPair.slots;

  // Select a teacher (randomize if multiple available)
  const selectedTeacher = bestPair.teachers.length === 1
    ? bestPair.teachers[0]
    : bestPair.teachers[Math.floor(random() * bestPair.teachers.length)];

  // Create entries for both slots
  const entry1: TimetableEntry = {
    classId,
    subjectId: subject.id,
    teacherId: selectedTeacher.teacherId,
    timeSlotId: slot1.id,
    academicYear,
    status: 'draft',
  };

  const entry2: TimetableEntry = {
    classId,
    subjectId: subject.id,
    teacherId: selectedTeacher.teacherId,
    timeSlotId: slot2.id,
    academicYear,
    status: 'draft',
  };

  result.entries.push(entry1, entry2);
  result.slotsPlaced += 2;
  result.doublePeriodsPlaced += 1;
  result.usedSlotIds.push(slot1.id, slot2.id);

  // Update teacher schedule
  if (!teacherSchedule.has(selectedTeacher.teacherId)) {
    teacherSchedule.set(selectedTeacher.teacherId, new Set());
  }
  teacherSchedule.get(selectedTeacher.teacherId)!.add(slot1.id);
  teacherSchedule.get(selectedTeacher.teacherId)!.add(slot2.id);

  // Update distribution (use existing map reference)
  const dayMap = subjectDistribution.get(subject.id);
  if (dayMap) {
    dayMap.set(slot1.dayOfWeek, (dayMap.get(slot1.dayOfWeek) || 0) + 2);
  }

  return result;
}

/**
 * Find pairs of consecutive time slots on the same day
 */
function findConsecutiveSlotPairs(
  allSlots: TimeSlot[],
  usedSlots: Set<string>
): [TimeSlot, TimeSlot][] {
  const pairs: [TimeSlot, TimeSlot][] = [];

  // Group slots by day
  const slotsByDay = new Map<number, TimeSlot[]>();
  for (const slot of allSlots) {
    if (slot.isBreak || usedSlots.has(slot.id)) continue;
    if (!slotsByDay.has(slot.dayOfWeek)) {
      slotsByDay.set(slot.dayOfWeek, []);
    }
    slotsByDay.get(slot.dayOfWeek)!.push(slot);
  }

  // Find consecutive pairs in each day
  for (const daySlots of slotsByDay.values()) {
    const sorted = daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (current.endTime === next.startTime) {
        pairs.push([current, next]);
      }
    }
  }

  return pairs;
}

/**
 * Check which days have at least one class
 */
function ensureDailyCoverage(
  timetable: TimetableEntry[],
  slotLookup: Map<string, TimeSlot>,
  availableDays: number[]
): Set<number> {
  const daysWithClasses = new Set<number>();

  for (const entry of timetable) {
    const slot = slotLookup.get(entry.timeSlotId);
    if (slot && !slot.isBreak) {
      daysWithClasses.add(slot.dayOfWeek);
    }
  }

  return daysWithClasses;
}

/**
 * Calculate overall distribution quality score (0-1)
 */
function calculateDistributionQuality(distribution?: SchedulerResult['distribution']): number {
  if (!distribution) return 0;

  const subjects = Object.values(distribution);
  if (subjects.length === 0) return 0;

  let totalScore = 0;
  for (const subject of subjects) {
    let score = 0;
    if (subject.meetsTarget) score += 0.5;
    if (subject.isBalanced) score += 0.5;
    totalScore += score;
  }

  return totalScore / subjects.length;
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
  currentTimetable: TimetableEntry[],
  strategy: SchedulerStrategy,
  random: () => number,
  targetDays: number
): SingleSlotOption[] {
  const scoredSlots: SingleSlotOption[] = [];

  // Get all available slots (not used and not breaks)
  const availableSlots = allSlots.filter(slot => !slot.isBreak && !usedSlots.has(slot.id));

  // Get current distribution for this subject
  const currentDistribution = subjectDistribution.get(subject.id) || new Map();
  const uniqueDays = new Set(currentDistribution.keys());

  for (const slot of availableSlots) {
    const availableTeachers = assignments.filter(assignment =>
      isTeacherAvailableForSlot(assignment.teacherId, slot, teacherAvailability, teacherSchedule)
    );

    if (availableTeachers.length === 0) continue;

    const dayCount = currentDistribution.get(slot.dayOfWeek) || 0;
    const consecutiveScore = calculateConsecutiveScore(slot, subject.id, currentTimetable, allSlots);
    const strategyWeight = getStrategyWeight(slot, strategy);
    const newDayBonus = !uniqueDays.has(slot.dayOfWeek) && uniqueDays.size < targetDays ? 1.5 : 1;
    const distributionWeight = 1 / (dayCount + 1);
    const consecutiveWeight = 1 / (1 + consecutiveScore);
    const randomJitter = SCHEDULER_CONFIG.randomization.enabled
      ? random() * SCHEDULER_CONFIG.randomization.jitter
      : 0;

    const score = strategyWeight * newDayBonus * distributionWeight * consecutiveWeight + randomJitter;

    scoredSlots.push({
      slot,
      score,
      availableTeachers,
    });
  }

  scoredSlots.sort((a, b) => b.score - a.score);

  return scoredSlots;
}

/**
 * Calculate how many consecutive slots this subject would create
 * Lower score is better (fewer consecutive slots)
 */
function calculateConsecutiveScore(
  slot: TimeSlot,
  subjectId: string,
  currentTimetable: TimetableEntry[],
  allSlots: TimeSlot[]
): number {
  let score = 0;

  const sameDayEntries = currentTimetable
    .filter(entry => entry.subjectId === subjectId)
    .map(entry => allSlots.find(s => s.id === entry.timeSlotId))
    .filter((s): s is TimeSlot => s !== undefined && s.dayOfWeek === slot.dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (let i = 0; i < sameDayEntries.length; i++) {
    const current = sameDayEntries[i];
    const next = sameDayEntries[i + 1];
    if (!next) break;
    if (current.endTime === next.startTime) {
      score += 1;
    }
  }

  return score;
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
  timetable: TimetableEntry[],
  targetDaysBySubject: Map<string, number>
): SchedulerResult['distribution'] {
  const distribution: SchedulerResult['distribution'] = {};
  const daysCoverage = new Map<number, number>();

  subjects.forEach(subject => {
    const dayMap = subjectDistribution.get(subject.id) || new Map();
    const byDay: { [day: number]: number } = {};
    let totalHours = 0;

    dayMap.forEach((count, day) => {
      byDay[day] = count;
      totalHours += count;
      daysCoverage.set(day, (daysCoverage.get(day) || 0) + count);
    });

    const uniqueDays = Object.keys(byDay).length;
    const targetDays = targetDaysBySubject.get(subject.id) || 1;

    const maxDayShare = Math.max(...Object.values(byDay), 0) / Math.max(totalHours, 1);
    const meetsTarget = uniqueDays >= targetDays;
    const isBalanced = totalHours === 0 || maxDayShare <= 0.5;

    distribution![subject.id] = {
      subjectName: subject.name,
      totalHours,
      byDay,
      uniqueDays,
      meetsTarget,
      isBalanced,
    };
  });

  return distribution;
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
