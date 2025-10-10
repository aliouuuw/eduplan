'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCalendarContext } from '../../calendar-context';
import { useGlobalSaving } from '@/lib/global-saving-context';
import { useSession } from 'next-auth/react';
import { calendarEventToAvailability } from '@/lib/availability-calendar-adapter';
import {
  generateWorkWeekTemplate,
  generateMorningShiftTemplate,
  generateAfternoonShiftTemplate,
  clearWeekEvents,
} from '@/lib/availability-utils';
import { Calendar, Trash2, Copy, Sun, Sunset } from 'lucide-react';
import { toast } from 'sonner';

export default function CalendarHeaderActionsTemplates() {
  const { events, setEvents, date } = useCalendarContext()
  const { isSaving } = useGlobalSaving();
  const { data: session } = useSession();

  const handleApplyTemplate = async (templateName: string) => {
    if (isSaving) return;

    let newEvents;

    switch (templateName) {
      case 'work-week':
        newEvents = generateWorkWeekTemplate(date);
        break;
      case 'morning':
        newEvents = generateMorningShiftTemplate(date);
        break;
      case 'afternoon':
        newEvents = generateAfternoonShiftTemplate(date);
        break;
      case 'clear-week':
        const clearedEvents = clearWeekEvents(events, date);
        setEvents(clearedEvents);
        toast.success('Week cleared');
        return;
      default:
        return;
    }

    // Apply template events with optimistic UI and backend save
    const optimisticEvents = [...events, ...newEvents];
    setEvents(optimisticEvents);

    try {
      // Save all template events to backend
      const savePromises = newEvents.map(async (event) => {
        const availabilityData = calendarEventToAvailability(
          event,
          session?.user?.id || '',
          session?.user?.schoolId || ''
        );

        const response = await fetch('/api/teacher-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(availabilityData),
        });

        if (!response.ok) {
          throw new Error(`Failed to save ${event.title}`);
        }

        const savedSlot = await response.json();
        return { tempId: event.id, savedId: savedSlot.id };
      });

      const results = await Promise.all(savePromises);

      // Update event IDs with real ones
      const finalEvents = optimisticEvents.map(event => {
        const result = results.find(r => r.tempId === event.id);
        return result ? { ...event, id: result.savedId } : event;
      });

      setEvents(finalEvents);

      const templateNameMap = {
        'work-week': 'Work week template applied (9 AM - 5 PM)',
        'morning': 'Morning shift template applied (8 AM - 12 PM)',
        'afternoon': 'Afternoon shift template applied (1 PM - 5 PM)'
      };

      toast.success(templateNameMap[templateName as keyof typeof templateNameMap]);

    } catch (error) {
      console.error('Error applying template:', error);
      // Revert optimistic update
      setEvents(events);
      toast.error('Failed to apply template');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" disabled={isSaving}>
          <Calendar className="h-4 w-4" />
          Templates
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Templates</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleApplyTemplate('work-week')}>
          <Calendar className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Work Week</div>
            <div className="text-xs text-muted-foreground">Mon-Fri, 9 AM - 5 PM</div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleApplyTemplate('morning')}>
          <Sun className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Morning Shift</div>
            <div className="text-xs text-muted-foreground">Mon-Fri, 8 AM - 12 PM</div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleApplyTemplate('afternoon')}>
          <Sunset className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Afternoon Shift</div>
            <div className="text-xs text-muted-foreground">Mon-Fri, 1 PM - 5 PM</div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => handleApplyTemplate('clear-week')}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear This Week
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

