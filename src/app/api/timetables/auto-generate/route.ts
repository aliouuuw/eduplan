import { NextRequest, NextResponse } from 'next/server';
import { auth, isSchoolAdmin, isSuperAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  classes,
  subjects,
  users,
  teacherClasses,
  teacherAvailability,
  timeSlots,
  timetables
} from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { generateScheduleForClass, SchedulerConstraints } from '@/lib/auto-scheduler';

// Validation schema
const autoGenerateSchema = z.object({
  classId: z.string().min(1),
  preserveExisting: z.boolean().default(false),
  strategy: z.enum(['balanced', 'morning-heavy', 'afternoon-heavy']).default('balanced'),
});

/**
 * POST /api/timetables/auto-generate
 * Auto-generate a complete timetable for a class using AI scheduling algorithm
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSchoolAdmin(session.user.role) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = autoGenerateSchema.parse(body);

    const schoolId = session.user.schoolId;
    if (!schoolId && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    console.log(`🚀 Starting auto-generation for class ${validated.classId}`);

    // Step 1: Gather all constraints from database
    const constraints = await gatherConstraints(validated.classId, schoolId || undefined);

    if (!constraints) {
      return NextResponse.json(
        { error: 'Class not found or no data available for scheduling' },
        { status: 404 }
      );
    }

    // Step 1.5: Validate prerequisites before attempting generation
    const validation = validateConstraints(constraints);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Cannot generate timetable',
          reason: validation.reason,
          suggestions: validation.suggestions,
          missingData: validation.missingData,
        },
        { status: 400 }
      );
    }

    // Step 2: Get existing timetable if preserving
    let existingTimetable: any[] = [];
    if (validated.preserveExisting) {
      existingTimetable = await db
        .select({
          id: timetables.id,
          classId: timetables.classId,
          subjectId: timetables.subjectId,
          teacherId: timetables.teacherId,
          timeSlotId: timetables.timeSlotId,
          status: timetables.status,
          academicYear: timetables.academicYear,
        })
        .from(timetables)
        .where(
          and(
            eq(timetables.classId, validated.classId),
            eq(timetables.schoolId, schoolId || '')
          )
        );
    }

    // Step 3: Run the auto-scheduler
    const schedulerInput: SchedulerConstraints = {
      ...constraints,
      existingTimetable,
      preserveExisting: validated.preserveExisting,
    };

    console.log(`📊 Running scheduler with ${constraints.subjects.length} subjects, ${constraints.teacherAssignments.length} assignments`);

    const result = generateScheduleForClass(schedulerInput);

    // Step 4: Save draft timetable entries to database
    const savedEntries = [];
    const saveErrors = [];

    for (const entry of result.timetable) {
      try {
        // Skip if this entry already exists (when preserving existing)
        if (validated.preserveExisting) {
          const existing = existingTimetable.find(
            e => e.timeSlotId === entry.timeSlotId && e.subjectId === entry.subjectId
          );
          if (existing) continue;
        }

        const saved = await db.insert(timetables).values({
          id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          schoolId: schoolId || '',
          classId: entry.classId,
          subjectId: entry.subjectId,
          teacherId: entry.teacherId,
          timeSlotId: entry.timeSlotId,
          academicYear: entry.academicYear,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        savedEntries.push(saved[0]);
      } catch (error) {
        console.error('Error saving timetable entry:', error);
        saveErrors.push({
          entry,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`✅ Auto-generation complete: ${savedEntries.length} entries saved, ${saveErrors.length} errors`);

    // Step 5: Return comprehensive result
    return NextResponse.json({
      success: result.success && saveErrors.length === 0,
      result: {
        ...result,
        savedEntries: savedEntries.length,
        saveErrors: saveErrors.length,
      },
      summary: {
        classId: validated.classId,
        totalSubjects: constraints.subjects.length,
        subjectsPlaced: result.statistics.subjectsPlaced,
        slotsPlaced: result.statistics.slotsPlaced,
        conflictsFound: result.conflicts.length,
        multiTeacherChoices: result.multiTeacherSlots.length,
        entriesSaved: savedEntries.length,
        saveErrors: saveErrors.length,
        preserveExisting: validated.preserveExisting,
      },
      nextSteps: result.multiTeacherSlots.length > 0
        ? ['Review multi-teacher selections', 'Confirm and save timetable']
        : ['Review generated schedule', 'Confirm and save timetable'],
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Error in auto-generation:', error);
    return NextResponse.json({
      error: 'Auto-generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Validate that all prerequisites are met for auto-generation
 */
function validateConstraints(constraints: SchedulerConstraints): {
  valid: boolean;
  reason?: string;
  suggestions?: string[];
  missingData?: {
    subjects: boolean;
    subjectsWithQuotas: boolean;
    teachers: boolean;
    teacherAssignments: boolean;
    teacherAvailability: boolean;
    timeSlots: boolean;
  };
} {
  const missing = {
    subjects: constraints.subjects.length === 0,
    subjectsWithQuotas: constraints.subjects.filter(s => s.weeklyHours > 0).length === 0,
    teachers: constraints.teachers.length === 0,
    teacherAssignments: constraints.teacherAssignments.length === 0,
    teacherAvailability: constraints.teacherAvailability.length === 0,
    timeSlots: constraints.timeSlots.filter(s => !s.isBreak).length === 0,
  };

  const suggestions: string[] = [];

  // Check for subjects
  if (missing.subjects) {
    return {
      valid: false,
      reason: 'No subjects found for this class',
      suggestions: [
        'Add subjects to your school',
        'Assign teachers to subjects for this class',
        'Go to Admin > Subjects to create subjects',
      ],
      missingData: missing,
    };
  }

  // Check for subjects with quotas
  if (missing.subjectsWithQuotas) {
    const subjectsWithoutQuotas = constraints.subjects.filter(s => s.weeklyHours === 0 || !s.weeklyHours);
    return {
      valid: false,
      reason: `No subjects have weekly hour quotas set (${constraints.subjects.length} subject${constraints.subjects.length === 1 ? '' : 's'} found without quotas)`,
      suggestions: [
        'Go to Admin > Subjects',
        'Edit each subject and set the "Weekly Hours" field',
        'Example: Math = 5 hours/week, French = 4 hours/week',
        `Subjects needing quotas: ${subjectsWithoutQuotas.map(s => s.name).join(', ')}`,
      ],
      missingData: missing,
    };
  }

  // Check for teachers
  if (missing.teachers) {
    return {
      valid: false,
      reason: 'No teachers assigned to this class',
      suggestions: [
        'Go to Admin > Teachers',
        'Assign teachers to subjects for this class',
      ],
      missingData: missing,
    };
  }

  // Check for teacher assignments
  if (missing.teacherAssignments) {
    return {
      valid: false,
      reason: 'No teacher-subject assignments found for this class',
      suggestions: [
        'Go to Admin > Teachers',
        'For each teacher, assign them to subjects they teach',
        'Make sure to assign them to this specific class',
      ],
      missingData: missing,
    };
  }

  // Check for teacher availability
  if (missing.teacherAvailability) {
    return {
      valid: false,
      reason: 'No teacher availability schedules set',
      suggestions: [
        'Go to Admin > Teachers > Availability',
        'Set availability schedules for all teachers',
        'Use bulk operations to set common schedules quickly',
        `${constraints.teachers.length} teacher${constraints.teachers.length === 1 ? '' : 's'} need${constraints.teachers.length === 1 ? 's' : ''} availability set`,
      ],
      missingData: missing,
    };
  }

  // Check for time slots
  if (missing.timeSlots) {
    return {
      valid: false,
      reason: 'No time slots defined',
      suggestions: [
        'Go to Admin > Time Slots',
        'Create your school\'s daily schedule',
        'Example: 8:00-9:00, 9:00-10:00, etc.',
      ],
      missingData: missing,
    };
  }

  // All prerequisites met
  return { valid: true };
}

/**
 * Gather all scheduling constraints from the database
 */
async function gatherConstraints(classId: string, schoolId?: string): Promise<SchedulerConstraints | null> {
  try {
    // 1. Get class info
    const classInfo = await db
      .select({
        id: classes.id,
        name: classes.name,
        academicYear: classes.academicYear,
      })
      .from(classes)
      .where(
        schoolId
          ? and(eq(classes.id, classId), eq(classes.schoolId, schoolId))
          : eq(classes.id, classId)
      )
      .limit(1);

    if (classInfo.length === 0) return null;

    // 2. Get subjects for this class (via teacher assignments)
    const subjectIds = new Set<string>();
    const teacherAssignments: any[] = [];

    const assignments = await db
      .select({
        teacherId: users.id,
        teacherName: users.name,
        teacherEmail: users.email,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectWeeklyHours: subjects.weeklyHours,
      })
      .from(teacherClasses)
      .innerJoin(users, eq(teacherClasses.teacherId, users.id))
      .innerJoin(subjects, eq(teacherClasses.subjectId, subjects.id))
      .where(
        schoolId
          ? and(eq(teacherClasses.classId, classId), eq(teacherClasses.schoolId, schoolId))
          : eq(teacherClasses.classId, classId)
      );

    assignments.forEach(assignment => {
      subjectIds.add(assignment.subjectId);
      teacherAssignments.push({
        teacherId: assignment.teacherId,
        teacherName: assignment.teacherName,
        subjectId: assignment.subjectId,
        subjectName: assignment.subjectName,
      });
    });

    // 3. Get unique subjects with weekly hours
    const uniqueSubjects = Array.from(subjectIds).map(subjectId => {
      const assignment = assignments.find(a => a.subjectId === subjectId);
      return {
        id: subjectId,
        name: assignment?.subjectName || 'Unknown',
        weeklyHours: assignment?.subjectWeeklyHours || 0,
      };
    });

    // 4. Get unique teachers
    const teacherIds = new Set(assignments.map(a => a.teacherId));
    const teachers = Array.from(teacherIds).map(teacherId => {
      const assignment = assignments.find(a => a.teacherId === teacherId);
      return {
        id: teacherId,
        name: assignment?.teacherName || 'Unknown',
        email: assignment?.teacherEmail || '',
      };
    });

    // 5. Get teacher availability
    const availabilityData = await db
      .select({
        id: teacherAvailability.id,
        teacherId: teacherAvailability.teacherId,
        dayOfWeek: teacherAvailability.dayOfWeek,
        startTime: teacherAvailability.startTime,
        endTime: teacherAvailability.endTime,
      })
      .from(teacherAvailability)
      .where(
        and(
          inArray(teacherAvailability.teacherId, Array.from(teacherIds)),
          schoolId ? eq(teacherAvailability.schoolId, schoolId) : undefined
        )
      );

    // 6. Get time slots
    const slotDataRaw = await db
      .select({
        id: timeSlots.id,
        dayOfWeek: timeSlots.dayOfWeek,
        startTime: timeSlots.startTime,
        endTime: timeSlots.endTime,
        isBreak: timeSlots.isBreak,
      })
      .from(timeSlots)
      .where(schoolId ? eq(timeSlots.schoolId, schoolId) : undefined);

    const slotData = slotDataRaw.map(slot => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBreak: slot.isBreak ?? false, // Convert null to false
    }));

    return {
      classId,
      subjects: uniqueSubjects,
      teachers,
      teacherAssignments,
      teacherAvailability: availabilityData,
      timeSlots: slotData,
    };

  } catch (error) {
    console.error('Error gathering constraints:', error);
    return null;
  }
}
