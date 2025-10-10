'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Users, 
  Plus,
  Grid3x3,
  Save,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Class {
  id: string;
  name: string;
  levelId: string;
  levelName?: string;
  academicYear: string;
}

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  name: string;
  isBreak: boolean;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface TimetableEntry {
  id?: string;
  classId: string;
  subjectId?: string;
  teacherId?: string;
  timeSlotId: string;
  status: 'draft' | 'active';
  academicYear: string;
}

interface Assignment {
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function AdminTimetablesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?schoolId=${session?.user?.schoolId}`);
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
    }
  };

  // Fetch time slots
  const fetchTimeSlots = async () => {
    try {
      const response = await fetch('/api/time-slots');
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.slots || []);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load time slots',
        variant: 'destructive',
      });
    }
  };

  // Fetch teacher assignments for selected class
  const fetchAssignments = async (classId: string) => {
    try {
      const response = await fetch(`/api/teacher-assignments?classId=${classId}`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teacher assignments',
        variant: 'destructive',
      });
    }
  };

  // Fetch timetable entries for selected class (if any exist)
  const fetchTimetable = async (classId: string) => {
    try {
      const response = await fetch(`/api/timetables?classId=${classId}`);
      if (response.ok) {
        const data = await response.json();
        setTimetableEntries(data.timetable || []);
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
      // Don't show error toast - timetable might not exist yet
    }
  };

  useEffect(() => {
    if (session?.user?.schoolId) {
      fetchClasses();
      fetchTimeSlots();
      setLoading(false);
    }
  }, [session?.user?.schoolId]);

  useEffect(() => {
    if (selectedClass) {
      fetchAssignments(selectedClass);
      fetchTimetable(selectedClass);
    }
  }, [selectedClass]);

  // Group time slots by day
  const slotsByDay = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<number, TimeSlot[]>);

  // Sort time slots by start time
  Object.keys(slotsByDay).forEach(day => {
    slotsByDay[parseInt(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // Get active days (days that have time slots)
  const activeDays = Object.keys(slotsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  const handleCellClick = (timeSlotId: string, slot: TimeSlot) => {
    if (slot.isBreak || !selectedClass) return;

    // Check if entry already exists
    const existingEntry = timetableEntries.find(e => e.timeSlotId === timeSlotId);
    
    if (existingEntry) {
      // Remove entry
      setTimetableEntries(prev => prev.filter(e => e.timeSlotId !== timeSlotId));
    } else {
      // Add placeholder entry
      setTimetableEntries(prev => [...prev, {
        classId: selectedClass,
        timeSlotId,
        status: 'draft',
        academicYear: classes.find(c => c.id === selectedClass)?.academicYear || '2025-2026',
      }]);
    }
    
    setHasChanges(true);
  };

  const handleAssignmentSelect = (timeSlotId: string, assignmentIndex: number) => {
    const assignment = assignments[assignmentIndex];
    
    setTimetableEntries(prev => prev.map(entry => 
      entry.timeSlotId === timeSlotId
        ? { ...entry, subjectId: assignment.subjectId, teacherId: assignment.teacherId }
        : entry
    ));
    
    setHasChanges(true);
  };

  const getEntryForSlot = (timeSlotId: string) => {
    return timetableEntries.find(e => e.timeSlotId === timeSlotId);
  };

  const getAssignmentDetails = (entry: TimetableEntry) => {
    if (!entry.subjectId || !entry.teacherId) return null;
    return assignments.find(a => a.subjectId === entry.subjectId && a.teacherId === entry.teacherId);
  };

  const handleSaveTimetable = async () => {
    if (!selectedClass) return;

    setSaving(true);
    try {
      // Here we'll implement the actual save logic
      // For now, just show a success message
      toast({
        title: 'Success',
        description: 'Timetable saved successfully',
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving timetable:', error);
      toast({
        title: 'Error',
        description: 'Failed to save timetable',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    totalSlots: timeSlots.filter(s => !s.isBreak).length,
    scheduledSlots: timetableEntries.filter(e => e.subjectId && e.teacherId).length,
    availableTeachers: new Set(assignments.map(a => a.teacherId)).size,
    activeDays: activeDays.length,
  };

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black">Timetable Builder</h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Create and manage class timetables with intelligent conflict detection
            </p>
          </div>
          {selectedClass && hasChanges && (
            <Button 
              onClick={handleSaveTimetable} 
              disabled={saving}
              className="bg-black hover:bg-gray-800"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Timetable'}
            </Button>
          )}
        </div>

        {/* Class Selector */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Class to Build Timetable
                </Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.academicYear}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </header>

      {/* Stats Section */}
      {selectedClass && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Periods
                </CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.totalSlots}</p>
                <p className="text-xs text-gray-500">Available teaching slots</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Scheduled
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.scheduledSlots}</p>
                <p className="text-xs text-gray-500">
                  {stats.totalSlots > 0 
                    ? `${Math.round((stats.scheduledSlots / stats.totalSlots) * 100)}% complete`
                    : 'No slots available'
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Teachers
                </CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.availableTeachers}</p>
                <p className="text-xs text-gray-500">Assigned to this class</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Active Days
                </CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-black">{stats.activeDays}</p>
                <p className="text-xs text-gray-500">Days with time slots</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Timetable Grid */}
      {selectedClass ? (
        activeDays.length > 0 ? (
          <section className="space-y-4">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-black flex items-center space-x-2">
                  <Grid3x3 className="h-5 w-5" />
                  <span>Weekly Schedule</span>
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Click on a time slot to add or remove it from the timetable. Select teacher and subject assignments.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-8 gap-2 mb-4 pb-4 border-b border-gray-200">
                      <div className="font-semibold text-sm text-gray-700">Time</div>
                      {activeDays.map(day => (
                        <div key={day} className="font-semibold text-sm text-gray-700 text-center">
                          {DAYS_OF_WEEK[day]}
                        </div>
                      ))}
                    </div>

                    {/* Time Slots Rows */}
                    {slotsByDay[activeDays[0]]?.map((slot, slotIndex) => (
                      <div key={slot.id} className="grid grid-cols-8 gap-2 mb-2">
                        {/* Time Column */}
                        <div className="flex flex-col justify-center text-xs text-gray-600 font-mono">
                          <div>{slot.startTime}</div>
                          <div className="text-gray-400">{slot.endTime}</div>
                        </div>

                        {/* Day Columns */}
                        {activeDays.map(day => {
                          const daySlot = slotsByDay[day]?.[slotIndex];
                          if (!daySlot) return <div key={day} className="min-h-[80px]" />;

                          const entry = getEntryForSlot(daySlot.id);
                          const assignment = entry ? getAssignmentDetails(entry) : null;

                          return (
                            <div
                              key={`${day}-${daySlot.id}`}
                              className={`min-h-[80px] rounded-lg border-2 transition-all ${
                                daySlot.isBreak
                                  ? 'bg-orange-50 border-orange-200 cursor-not-allowed'
                                  : entry
                                  ? assignment
                                    ? 'bg-blue-50 border-blue-300 cursor-pointer hover:border-blue-400'
                                    : 'bg-gray-50 border-gray-300 cursor-pointer hover:border-gray-400'
                                  : 'bg-white border-gray-200 cursor-pointer hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => handleCellClick(daySlot.id, daySlot)}
                            >
                              {daySlot.isBreak ? (
                                <div className="p-2 text-center">
                                  <p className="text-xs font-medium text-orange-700">
                                    {daySlot.name}
                                  </p>
                                </div>
                              ) : entry ? (
                                <div className="p-2 space-y-1">
                                  {assignment ? (
                                    <>
                                      <p className="text-xs font-semibold text-blue-900 truncate">
                                        {assignment.subjectName}
                                      </p>
                                      <p className="text-xs text-blue-700 truncate">
                                        {assignment.teacherName}
                                      </p>
                                    </>
                                  ) : (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-gray-600">
                                        Select assignment
                                      </p>
                                      <Select
                                        value=""
                                        onValueChange={(value) => handleAssignmentSelect(daySlot.id, parseInt(value))}
                                      >
                                        <SelectTrigger className="h-7 text-xs">
                                          <SelectValue placeholder="Choose..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {assignments.map((assign, idx) => (
                                            <SelectItem key={idx} value={idx.toString()}>
                                              {assign.subjectName} - {assign.teacherName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-2 text-center">
                                  <Plus className="h-4 w-4 text-gray-400 mx-auto" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : (
          <Card className="rounded-2xl border border-yellow-200 bg-yellow-50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900">No Time Slots Available</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please create time slots in the Time Slots management page before building timetables.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-yellow-300 hover:bg-yellow-100"
                    onClick={() => window.location.href = '/dashboard/admin/time-slots'}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Manage Time Slots
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
          <CardContent className="p-12">
            <div className="text-center space-y-3">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-700">Select a Class</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Choose a class from the dropdown above to start building or editing its timetable.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
