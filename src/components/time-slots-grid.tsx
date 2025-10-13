'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Clock, BookOpen, Coffee } from 'lucide-react';

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  name: string;
  isBreak: boolean;
  templateId: string | null;
  createdAt: Date;
}

interface TimeSlotsGridProps {
  timeSlots: TimeSlot[];
  selectedTemplateId: string;
  onEditSlot: (slot: TimeSlot) => void;
  onAddSlot: (dayOfWeek: number, startTime: string) => void;
  onDeleteSlot: (slotId: string) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
];

// Generate time slots from 8:00 AM to 6:00 PM in 30-minute intervals
const TIME_SLOTS: string[] = [];
for (let hour = 8; hour <= 18; hour++) {
  for (let minute = 0; minute < 60; minute += 30) {
    if (hour === 18 && minute > 0) break; // Stop at 18:00
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    TIME_SLOTS.push(time);
  }
}

export default function TimeSlotsGrid({
  timeSlots,
  selectedTemplateId,
  onEditSlot,
  onAddSlot,
  onDeleteSlot,
}: TimeSlotsGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Group time slots by day and time for quick lookup
  const slotsByDayAndTime = timeSlots.reduce((acc, slot) => {
    const key = `${slot.dayOfWeek}-${slot.startTime}`;
    acc[key] = slot;
    return acc;
  }, {} as Record<string, TimeSlot>);

  const getSlotForCell = (dayOfWeek: number, startTime: string) => {
    return slotsByDayAndTime[`${dayOfWeek}-${startTime}`];
  };

  const handleCellClick = (dayOfWeek: number, startTime: string) => {
    const existingSlot = getSlotForCell(dayOfWeek, startTime);
    if (existingSlot) {
      onEditSlot(existingSlot);
    } else {
      onAddSlot(dayOfWeek, startTime);
    }
  };

  return (
    <div className="space-y-4">
      {/* Time slots grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header row */}
          <div className="grid grid-cols-8 gap-2 mb-4 pb-4 border-b border-gray-200">
            <div className="font-semibold text-sm text-gray-700 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Time
            </div>
            {DAYS_OF_WEEK.map(day => (
              <div key={day.value} className="font-semibold text-sm text-gray-700 text-center">
                {day.short}
              </div>
            ))}
          </div>

          {/* Time rows */}
          {TIME_SLOTS.map(timeSlot => (
            <div key={timeSlot} className="grid grid-cols-8 gap-2 mb-2">
              {/* Time column */}
              <div className="flex items-center justify-center text-xs text-gray-600 font-mono bg-gray-50 rounded px-2 py-3 min-h-[60px]">
                {timeSlot}
              </div>

              {/* Day columns */}
              {DAYS_OF_WEEK.map(day => {
                const slot = getSlotForCell(day.value, timeSlot);
                const cellKey = `${day.value}-${timeSlot}`;
                const isHovered = hoveredCell === cellKey;

                if (slot) {
                  // Existing time slot
                  return (
                    <Card
                      key={cellKey}
                      className={`min-h-[60px] cursor-pointer transition-all hover:shadow-md ${
                        slot.isBreak
                          ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                          : 'bg-blue-50 border-blue-200 hover:border-blue-300'
                      }`}
                      onMouseEnter={() => setHoveredCell(cellKey)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => handleCellClick(day.value, timeSlot)}
                    >
                      <CardContent className="p-3 relative">
                        <div className="flex items-start justify-between mb-1">
                          <div className={`h-6 w-6 rounded flex items-center justify-center ${
                            slot.isBreak ? 'bg-orange-100' : 'bg-blue-100'
                          }`}>
                            {slot.isBreak ? (
                              <Coffee className="h-3 w-3 text-orange-600" />
                            ) : (
                              <BookOpen className="h-3 w-3 text-blue-600" />
                            )}
                          </div>
                          {isHovered && (
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-gray-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSlot(slot);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-red-200 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSlot(slot.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {slot.name}
                          </p>
                          <p className="text-xs text-gray-600 font-mono">
                            {slot.startTime}-{slot.endTime}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              slot.isBreak
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {slot.isBreak ? 'Break' : 'Class'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                } else {
                  // Empty slot
                  return (
                    <div
                      key={cellKey}
                      className={`min-h-[60px] border-2 border-dashed rounded-lg cursor-pointer transition-all flex items-center justify-center ${
                        isHovered
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                      onMouseEnter={() => setHoveredCell(cellKey)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => handleCellClick(day.value, timeSlot)}
                    >
                      {isHovered ? (
                        <div className="flex flex-col items-center space-y-1">
                          <Plus className="h-4 w-4 text-blue-500" />
                          <span className="text-xs text-blue-600 font-medium">Add slot</span>
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          <Plus className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  );
                }
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
          <span>Class Period</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
          <span>Break Period</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-dashed border-gray-300 bg-gray-50 rounded"></div>
          <span>Empty Slot (click to add)</span>
        </div>
      </div>
    </div>
  );
}

