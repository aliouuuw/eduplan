import { CalendarEvent } from '@/components/calendar/calendar-types';
import { isWithinInterval, areIntervalsOverlapping, startOfWeek, addDays, setHours, setMinutes } from 'date-fns';

/**
 * Check if two events overlap
 */
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  return areIntervalsOverlapping(
    { start: event1.start, end: event1.end },
    { start: event2.start, end: event2.end },
    { inclusive: false }
  );
}

/**
 * Find all events that conflict with a given event
 */
export function findConflicts(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
  return allEvents.filter(e => e.id !== event.id && eventsOverlap(e, event));
}

/**
 * Check if an event has conflicts
 */
export function hasConflicts(event: CalendarEvent, allEvents: CalendarEvent[]): boolean {
  return findConflicts(event, allEvents).length > 0;
}

/**
 * Copy an event to other days of the week
 */
export function copyEventToWeekdays(
  event: CalendarEvent,
  targetDays: number[] // 0=Sunday, 1=Monday, etc.
): CalendarEvent[] {
  const sourceDay = event.start.getDay();
  const weekStart = startOfWeek(event.start, { weekStartsOn: 1 }); // Monday
  
  const startHour = event.start.getHours();
  const startMinute = event.start.getMinutes();
  const endHour = event.end.getHours();
  const endMinute = event.end.getMinutes();
  
  return targetDays
    .filter(day => day !== sourceDay)
    .map(day => {
      // Calculate offset from week start (Monday = 0)
      const dayOffset = day === 0 ? 6 : day - 1; // Convert Sunday from 0 to 6
      const targetDate = addDays(weekStart, dayOffset);
      
      return {
        id: `temp-${Date.now()}-${day}`,
        title: event.title,
        color: event.color,
        start: setMinutes(setHours(targetDate, startHour), startMinute),
        end: setMinutes(setHours(targetDate, endHour), endMinute),
      };
    });
}

/**
 * Generate a standard work week template (9 AM - 5 PM, Monday to Friday)
 */
export function generateWorkWeekTemplate(referenceDate: Date): CalendarEvent[] {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const events: CalendarEvent[] = [];
  
  // Monday to Friday (days 0-4 of the week starting Monday)
  for (let day = 0; day < 5; day++) {
    const date = addDays(weekStart, day);
    events.push({
      id: `temp-${Date.now()}-${day}`,
      title: 'Available',
      color: 'green',
      start: setMinutes(setHours(date, 9), 0), // 9:00 AM
      end: setMinutes(setHours(date, 17), 0), // 5:00 PM
    });
  }
  
  return events;
}

/**
 * Generate morning shift template (8 AM - 12 PM, Monday to Friday)
 */
export function generateMorningShiftTemplate(referenceDate: Date): CalendarEvent[] {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const events: CalendarEvent[] = [];
  
  for (let day = 0; day < 5; day++) {
    const date = addDays(weekStart, day);
    events.push({
      id: `temp-${Date.now()}-${day}`,
      title: 'Available',
      color: 'green',
      start: setMinutes(setHours(date, 8), 0),
      end: setMinutes(setHours(date, 12), 0),
    });
  }
  
  return events;
}

/**
 * Generate afternoon shift template (1 PM - 5 PM, Monday to Friday)
 */
export function generateAfternoonShiftTemplate(referenceDate: Date): CalendarEvent[] {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const events: CalendarEvent[] = [];
  
  for (let day = 0; day < 5; day++) {
    const date = addDays(weekStart, day);
    events.push({
      id: `temp-${Date.now()}-${day}`,
      title: 'Available',
      color: 'green',
      start: setMinutes(setHours(date, 13), 0),
      end: setMinutes(setHours(date, 17), 0),
    });
  }
  
  return events;
}

/**
 * Clear all events for the current week
 */
export function clearWeekEvents(events: CalendarEvent[], referenceDate: Date): CalendarEvent[] {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  
  return events.filter(event => {
    return event.start < weekStart || event.start >= weekEnd;
  });
}

