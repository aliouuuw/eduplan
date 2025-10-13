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
  XCircle,
  Sparkles,
  Settings,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';

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

  // Auto-generation state
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenDialogOpen, setAutoGenDialogOpen] = useState(false);
  const [multiTeacherDialogOpen, setMultiTeacherDialogOpen] = useState(false);
  const [autoGenResults, setAutoGenResults] = useState<any>(null);
  const [multiTeacherSelections, setMultiTeacherSelections] = useState<Record<string, string>>({});

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
        // Map API response to expected TimetableEntry format
        const mappedEntries = (data.timetable || []).map((entry: any) => ({
          id: entry.id,
          classId: entry.classId,
          subjectId: entry.subjectId,
          teacherId: entry.teacherId,
          timeSlotId: entry.timeSlotId,
          status: entry.status,
          academicYear: entry.academicYear,
        }));
        setTimetableEntries(mappedEntries);
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

  const handleAutoGenerate = async (preserveExisting: boolean = false, strategy: string = 'balanced') => {
    if (!selectedClass) {
      toast({
        title: 'Error',
        description: 'Please select a class first',
        variant: 'destructive',
      });
      return;
    }

    setAutoGenerating(true);
    try {
      const response = await fetch('/api/timetables/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          preserveExisting,
          strategy,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle validation errors with helpful suggestions
        if (error.suggestions && error.suggestions.length > 0) {
          const suggestionsList = error.suggestions.map((s: string, i: number) => 
            `${i + 1}. ${s}`
          ).join('\n');
          
          toast({
            title: error.reason || 'Cannot generate timetable',
            description: `To proceed, please:\n${suggestionsList}`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Auto-generation failed',
            description: error.error || error.reason || 'Failed to generate timetable',
            variant: 'destructive',
          });
        }
        
        setAutoGenDialogOpen(false);
        setAutoGenerating(false);
        return;
      }

      const data = await response.json();
      setAutoGenResults(data);

      // Reload timetable to show generated entries
      await fetchTimetable(selectedClass);

      if (data.result.multiTeacherSlots.length > 0) {
        // Show multi-teacher selection dialog
        setMultiTeacherDialogOpen(true);
      } else {
        toast({
          title: 'Success',
          description: `Timetable auto-generated! ${data.result.statistics.slotsPlaced} slots placed.`,
        });
      }

      setAutoGenDialogOpen(false);

    } catch (error: any) {
      console.error('Error auto-generating timetable:', error);
      toast({
        title: 'Auto-generation failed',
        description: error.message || 'Failed to generate timetable',
        variant: 'destructive',
      });
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleMultiTeacherConfirm = async () => {
    if (!autoGenResults || Object.keys(multiTeacherSelections).length === 0) {
      setMultiTeacherDialogOpen(false);
      return;
    }

    try {
      // Apply teacher selections by updating the relevant timetable entries
      const updates = Object.entries(multiTeacherSelections).map(([timeSlotId, teacherId]) => {
        const entry = timetableEntries.find(e => e.timeSlotId === timeSlotId);
        if (!entry) return null;

        return fetch(`/api/timetables/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId,
            status: 'draft',
          }),
        });
      }).filter(Boolean);

      await Promise.all(updates);

      toast({
        title: 'Success',
        description: 'Teacher selections applied successfully',
      });

      // Reload timetable
      await fetchTimetable(selectedClass);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to apply teacher selections',
        variant: 'destructive',
      });
    } finally {
      setMultiTeacherDialogOpen(false);
      setMultiTeacherSelections({});
    }
  };

  const handleSaveTimetable = async () => {
    if (!selectedClass) return;

    setSaving(true);
    try {
      // Get current academic year for the class
      const currentAcademicYear = classes.find(c => c.id === selectedClass)?.academicYear || '2025-2026';

      // Process each timetable entry
      const savePromises = timetableEntries
        .filter(entry => entry.subjectId && entry.teacherId) // Only save complete entries
        .map(async (entry) => {
          const timetableData = {
            classId: selectedClass,
            subjectId: entry.subjectId,
            teacherId: entry.teacherId,
            timeSlotId: entry.timeSlotId,
            academicYear: currentAcademicYear,
            status: 'active' as const,
          };

          if (entry.id) {
            // Update existing entry
            const response = await fetch(`/api/timetables/${entry.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(timetableData),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || `Failed to update entry for ${entry.timeSlotId}`);
            }

            return response.json();
          } else {
            // Create new entry
            const response = await fetch('/api/timetables', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(timetableData),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || `Failed to create entry for ${entry.timeSlotId}`);
            }

            return response.json();
          }
        });

      // Wait for all save operations to complete
      await Promise.all(savePromises);

      toast({
        title: 'Success',
        description: `Timetable saved successfully. ${savePromises.length} entries saved.`,
      });

      setHasChanges(false);

      // Reload the timetable to get the latest data
      await fetchTimetable(selectedClass);

    } catch (error: any) {
      console.error('Error saving timetable:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save timetable',
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
              Create and manage class timetables with intelligent conflict detection and AI auto-generation
            </p>
          </div>
          {selectedClass && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAutoGenDialogOpen(true)}
                disabled={autoGenerating}
                className="border-purple-200 hover:bg-purple-50"
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                {autoGenerating ? 'Generating...' : 'Auto-Generate'}
              </Button>
              {hasChanges && (
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
                  <Link href="/dashboard/admin/scheduling/time-slots" passHref>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-yellow-300 hover:bg-yellow-100"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Manage Time Slots
                  </Button>
                </Link>
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

      {/* Auto-Generate Dialog */}
      <Dialog open={autoGenDialogOpen} onOpenChange={setAutoGenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <span>Auto-Generate Timetable</span>
            </DialogTitle>
            <DialogDescription>
              Let AI create a conflict-free schedule based on teacher availability and subject requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="preserve-existing"
                  className="rounded border-gray-300"
                />
                <label htmlFor="preserve-existing" className="text-sm">
                  Preserve existing manual entries
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Generation Strategy</label>
                <Select defaultValue="balanced">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced - Spread subjects evenly</SelectItem>
                    <SelectItem value="morning-heavy">Morning Heavy - Prioritize morning slots</SelectItem>
                    <SelectItem value="afternoon-heavy">Afternoon Heavy - Prioritize afternoon slots</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">What happens next:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>AI analyzes teacher availability and subject requirements</li>
                      <li>Generates conflict-free schedule using subject-first algorithm</li>
                      <li>If multiple teachers available, you'll be asked to choose</li>
                      <li>Review and save the generated timetable</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAutoGenDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAutoGenerate()}
                disabled={autoGenerating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {autoGenerating ? 'Generating...' : 'Generate Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Multi-Teacher Selection Dialog */}
      <Dialog open={multiTeacherDialogOpen} onOpenChange={setMultiTeacherDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <span>Select Teachers</span>
            </DialogTitle>
            <DialogDescription>
              Multiple teachers are available for these time slots. Please choose your preferred teacher for each.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {autoGenResults?.result?.multiTeacherSlots?.map((slot: any) => (
              <div key={slot.timeSlotId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {slot.subjectId} - Time slot needs teacher selection
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    Choice Required
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {slot.teachers.map((teacher: any) => (
                    <label key={teacher.teacherId} className="flex items-center space-x-3 p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name={`teacher-${slot.timeSlotId}`}
                        value={teacher.teacherId}
                        checked={multiTeacherSelections[slot.timeSlotId] === teacher.teacherId}
                        onChange={(e) => setMultiTeacherSelections(prev => ({
                          ...prev,
                          [slot.timeSlotId]: e.target.value
                        }))}
                        className="text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{teacher.teacherName}</div>
                        <div className="text-xs text-gray-500">
                          {teacher.reason === 'available' ? 'Available for this slot' : 'Preferred teacher'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMultiTeacherDialogOpen(false)}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleMultiTeacherConfirm}
              disabled={Object.keys(multiTeacherSelections).length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Apply Selections
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Panel */}
      {autoGenResults && (
        <Dialog open={!!autoGenResults} onOpenChange={() => setAutoGenResults(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {autoGenResults.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
                <span>Auto-Generation Results</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {autoGenResults.result?.statistics?.slotsPlaced || 0}
                  </div>
                  <div className="text-sm text-blue-700">Slots Placed</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {autoGenResults.result?.statistics?.subjectsPlaced || 0}
                  </div>
                  <div className="text-sm text-green-700">Subjects Placed</div>
                </div>
              </div>

              {autoGenResults.result?.conflicts?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-900">Conflicts Found:</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {autoGenResults.result.conflicts.map((conflict: any, index: number) => (
                      <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                        {conflict.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoGenResults.result?.multiTeacherSlots?.length > 0 && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-800">
                    <strong>{autoGenResults.result.multiTeacherSlots.length}</strong> time slot(s) have multiple teacher options.
                    {multiTeacherDialogOpen ? ' Select teachers now.' : ' Review selections needed.'}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setAutoGenResults(null)}
                >
                  Close
                </Button>
                {autoGenResults.result?.multiTeacherSlots?.length > 0 && !multiTeacherDialogOpen && (
                  <Button
                    onClick={() => setMultiTeacherDialogOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Select Teachers
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
