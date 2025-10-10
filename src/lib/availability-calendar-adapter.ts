import { CalendarEvent } from '@/components/calendar/calendar-types';
import { addDays, startOfWeek, setHours, setMinutes, parseISO } from 'date-fns';

export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  schoolId: string;
  dayOfWeek: number; // 1-7 (Monday-Sunday)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isRecurring: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert availability slots to calendar events for the current week
 */
export function availabilityToCalendarEvents(
  availability: AvailabilitySlot[],
  referenceDate: Date = new Date()
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday

  availability.forEach((slot) => {
    if (!slot.isActive) return;

    // Calculate the date for this slot's day of week
    // dayOfWeek: 1=Monday, 7=Sunday
    const eventDate = addDays(weekStart, slot.dayOfWeek - 1);

    // Parse time (HH:MM format)
    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    const [endHour, endMinute] = slot.endTime.split(':').map(Number);

    const startDateTime = setMinutes(setHours(eventDate, startHour), startMinute);
    const endDateTime = setMinutes(setHours(eventDate, endHour), endMinute);

    events.push({
      id: slot.id,
      title: slot.notes || 'Available',
      color: 'green', // Green for available time
      start: startDateTime,
      end: endDateTime,
    });
  });

  return events;
}

/**
 * Convert a calendar event to an availability slot for API submission
 */
export function calendarEventToAvailability(
  event: CalendarEvent,
  teacherId: string,
  schoolId: string
): Partial<AvailabilitySlot> {
  const start = new Date(event.start);
  const end = new Date(event.end);

  // Get day of week (1-7, Monday-Sunday)
  const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay();

  // Format time as HH:MM
  const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

  const result: any = {
    teacherId,
    schoolId,
    dayOfWeek,
    startTime,
    endTime,
    isRecurring: true, // Default to recurring
    isActive: true,
  };

  // Only include notes if not default "Available"
  if (event.title && event.title !== 'Available') {
    result.notes = event.title;
  }

  return result;
}

/**
 * Generate recurring events for multiple weeks (for month view)
 */
export function generateRecurringEvents(
  availability: AvailabilitySlot[],
  startDate: Date,
  weeks: number = 4
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (let week = 0; week < weeks; week++) {
    const weekStartDate = addDays(startDate, week * 7);
    const weekEvents = availabilityToCalendarEvents(availability, weekStartDate);
    events.push(...weekEvents);
  }

  return events;
}

