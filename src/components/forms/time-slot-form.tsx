'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Calendar, Coffee, BookOpen } from 'lucide-react';

const timeSlotSchema = z.object({
  dayOfWeek: z.number().min(1).max(7),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  isBreak: z.boolean().default(false),
}).refine((data) => data.startTime < data.endTime, {
  message: 'Start time must be before end time',
  path: ['endTime'],
});

type TimeSlotFormData = z.infer<typeof timeSlotSchema>;

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  name: string;
  isBreak: boolean;
  createdAt: Date;
}

interface TimeSlotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlot?: TimeSlot | null;
  onSubmit: (data: TimeSlotFormData) => void;
  loading?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export function TimeSlotForm({ open, onOpenChange, timeSlot, onSubmit, loading = false }: TimeSlotFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TimeSlotFormData>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '08:50',
      name: '',
      isBreak: false,
    },
  });

  const isBreak = watch('isBreak');

  useEffect(() => {
    if (timeSlot) {
      reset({
        dayOfWeek: timeSlot.dayOfWeek,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        name: timeSlot.name,
        isBreak: timeSlot.isBreak,
      });
    } else {
      reset({
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '08:50',
        name: '',
        isBreak: false,
      });
    }
  }, [timeSlot, reset]);

  const handleFormSubmit = async (data: TimeSlotFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isBreak ? (
              <Coffee className="h-5 w-5 text-orange-500" />
            ) : (
              <BookOpen className="h-5 w-5 text-blue-500" />
            )}
            <span>{timeSlot ? 'Edit Time Slot' : 'Create Time Slot'}</span>
          </DialogTitle>
          <DialogDescription>
            {isBreak 
              ? 'Configure break periods for students and staff'
              : 'Set up teaching periods for your school schedule'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Day of Week */}
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Day of Week</span>
              </Label>
              <Select
                value={watch('dayOfWeek').toString()}
                onValueChange={(value) => setValue('dayOfWeek', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dayOfWeek && (
                <p className="text-sm text-red-600">{errors.dayOfWeek.message}</p>
              )}
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>Start Time</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register('startTime')}
                  className={errors.startTime ? 'border-red-500' : ''}
                />
                {errors.startTime && (
                  <p className="text-sm text-red-600">{errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>End Time</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register('endTime')}
                  className={errors.endTime ? 'border-red-500' : ''}
                />
                {errors.endTime && (
                  <p className="text-sm text-red-600">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {isBreak ? 'Break Name' : 'Period Name'}
              </Label>
              <Input
                id="name"
                placeholder={isBreak ? 'e.g., Morning Break, Lunch' : 'e.g., 1st Period, Math Class'}
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Break Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isBreak"
                checked={isBreak}
                onCheckedChange={(checked) => setValue('isBreak', checked as boolean)}
              />
              <Label htmlFor="isBreak" className="text-sm">
                This is a break period (not a teaching period)
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loading}
              className="bg-black hover:bg-gray-800"
            >
              {isSubmitting || loading ? 'Saving...' : timeSlot ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
