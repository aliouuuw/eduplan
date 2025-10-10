'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCalendarContext } from '../calendar-context';
import { format } from 'date-fns';
import { DateTimePicker } from '@/components/form/date-time-picker';

const formSchema = z
  .object({
    notes: z.string().optional(),
    start: z.string().datetime(),
    end: z.string().datetime(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['end'],
    }
  );

export default function CalendarAvailabilityNewDialog() {
  const { 
    newEventDialogOpen, 
    setNewEventDialogOpen, 
    date, 
    events, 
    setEvents, 
    pendingEvent, 
    setPendingEvent,
    selectedEvent,
    setSelectedEvent
  } = useCalendarContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
      start: format(date, "yyyy-MM-dd'T'HH:mm"),
      end: format(date, "yyyy-MM-dd'T'HH:mm"),
    },
  });

  // Update form when pendingEvent is set (from quick create) OR selectedEvent (from drag-to-create)
  useEffect(() => {
    const eventToPrefill = pendingEvent || selectedEvent;
    if (eventToPrefill && newEventDialogOpen) {
      form.reset({
        notes: eventToPrefill.title === 'Available' ? '' : eventToPrefill.title,
        start: format(eventToPrefill.start, "yyyy-MM-dd'T'HH:mm"),
        end: format(eventToPrefill.end, "yyyy-MM-dd'T'HH:mm"),
      });
    }
  }, [pendingEvent, selectedEvent, newEventDialogOpen, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newEvent = {
      id: crypto.randomUUID(),
      title: values.notes || 'Available',
      start: new Date(values.start),
      end: new Date(values.end),
      color: 'green', // Always green for availability
    };

    // Always add as new event (pending event is never in the events array)
    setEvents([...events, newEvent]);

    setNewEventDialogOpen(false);
    setSelectedEvent(null);
    setPendingEvent(null);
    form.reset();
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      // Just clear the pending/selected event (no need to remove from events array)
      setPendingEvent(null);
      setSelectedEvent(null);
      form.reset();
    }
    setNewEventDialogOpen(open);
  };

  return (
    <Dialog open={newEventDialogOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Availability</DialogTitle>
          <DialogDescription>
            Set when you're available to teach. This will be applied as a recurring weekly slot.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Start Time</FormLabel>
                  <FormControl>
                    <DateTimePicker field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">End Time</FormLabel>
                  <FormControl>
                    <DateTimePicker field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Prefer morning classes, Available for substitutes"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Availability</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

