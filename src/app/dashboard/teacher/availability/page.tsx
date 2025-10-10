'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import AvailabilityCalendar from '@/components/calendar/availability-calendar';
import { CalendarEvent, Mode } from '@/components/calendar/calendar-types';
import {
  availabilityToCalendarEvents,
  calendarEventToAvailability,
  generateRecurringEvents,
  AvailabilitySlot,
} from '@/lib/availability-calendar-adapter';
import { startOfMonth } from 'date-fns';

export default function TeacherAvailability() {
  const { data: session } = useSession();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mode, setMode] = useState<Mode>('week');
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/teacher-availability');
      if (response.ok) {
        const data: AvailabilitySlot[] = await response.json();
        setAvailability(data);
        
        // Convert availability to calendar events
        if (mode === 'week' || mode === 'day') {
          const calendarEvents = availabilityToCalendarEvents(data, date);
          setEvents(calendarEvents);
        } else {
          // For month view, show recurring events
          const recurringEvents = generateRecurringEvents(data, startOfMonth(date), 5);
          setEvents(recurringEvents);
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  // Update events when date or mode changes
  useEffect(() => {
    if (availability.length > 0) {
      if (mode === 'week' || mode === 'day') {
        const calendarEvents = availabilityToCalendarEvents(availability, date);
        setEvents(calendarEvents);
      } else {
        const recurringEvents = generateRecurringEvents(availability, startOfMonth(date), 5);
        setEvents(recurringEvents);
      }
    }
  }, [date, mode, availability]);

  // Handle event changes from calendar
  const handleEventsChange = async (newEvents: CalendarEvent[]) => {
    // Find new, modified, or deleted events
    const oldEventIds = new Set(events.map(e => e.id));
    const newEventIds = new Set(newEvents.map(e => e.id));

    // Handle new events
    for (const event of newEvents) {
      if (!oldEventIds.has(event.id)) {
        // New event - create availability
        const availabilityData = calendarEventToAvailability(
          event,
          session?.user?.id || '',
          session?.user?.schoolId || ''
        );

        try {
          const response = await fetch('/api/teacher-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(availabilityData),
          });

          if (!response.ok) {
            const error = await response.json();
            toast.error(error.error || 'Failed to add availability');
            continue;
          }

          toast.success('Availability added');
        } catch (error) {
          console.error('Error adding availability:', error);
          toast.error('An error occurred');
        }
      }
    }

    // Handle deleted events
    for (const oldEvent of events) {
      if (!newEventIds.has(oldEvent.id)) {
        // Deleted event - remove availability
        try {
          const response = await fetch(`/api/teacher-availability/${oldEvent.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const error = await response.json();
            toast.error(error.error || 'Failed to delete availability');
            continue;
          }

          toast.success('Availability removed');
        } catch (error) {
          console.error('Error deleting availability:', error);
          toast.error('An error occurred');
        }
      }
    }

    // Refresh from server
    await fetchAvailability();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-black">My Availability</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Set your weekly availability by clicking and dragging on the calendar. Click on any slot to edit or remove it.
        </p>
      </header>

      <AvailabilityCalendar
        events={events}
        setEvents={handleEventsChange}
        mode={mode}
        setMode={setMode}
        date={date}
        setDate={setDate}
        calendarIconIsToday={false}
      />
    </div>
  );
}

