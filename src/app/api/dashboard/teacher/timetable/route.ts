import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { timetables, classes, subjects, timeSlots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/dashboard/teacher/timetable
 * Returns the teacher's personal timetable (all scheduled periods)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    const teacherId = session.user.id;
    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // Get teacher's timetable with all related information
    const schedule = await db
      .select({
        id: timetables.id,
        academicYear: timetables.academicYear,
        status: timetables.status,
        className: classes.name,
        classId: classes.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectId: subjects.id,
        dayOfWeek: timeSlots.dayOfWeek,
        startTime: timeSlots.startTime,
        endTime: timeSlots.endTime,
        slotName: timeSlots.name,
        isBreak: timeSlots.isBreak,
      })
      .from(timetables)
      .innerJoin(classes, eq(timetables.classId, classes.id))
      .innerJoin(subjects, eq(timetables.subjectId, subjects.id))
      .innerJoin(timeSlots, eq(timetables.timeSlotId, timeSlots.id))
      .where(
        and(
          eq(timetables.teacherId, teacherId),
          eq(timetables.schoolId, schoolId),
          eq(timetables.status, 'active')
        )
      )
      .orderBy(timeSlots.dayOfWeek, timeSlots.startTime);

    // Group by day of week for easier frontend rendering
    const scheduleByDay = schedule.reduce((acc, entry) => {
      const day = entry.dayOfWeek;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(entry);
      return acc;
    }, {} as Record<number, typeof schedule>);

    return NextResponse.json({
      schedule,
      scheduleByDay,
      totalPeriods: schedule.length,
    });
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

