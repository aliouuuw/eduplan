'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Clock, Plus, Save, Trash2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs, createBreadcrumbs } from '@/components/layout/breadcrumbs';

interface AvailabilitySlot {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  notes?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
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

export default function TeacherAvailabilityPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch teacher info and availability
  const fetchData = async () => {
    if (!teacherId) return;

    setLoading(true);
    try {
      // Fetch teacher info
      const teacherResponse = await fetch(`/api/users/${teacherId}`);
      if (teacherResponse.ok) {
        const teacherData = await teacherResponse.json();
        setTeacher({
          id: teacherData.teacher.id,
          name: teacherData.teacher.name,
          email: teacherData.teacher.email,
        });
      }

      // Fetch availability
      const availResponse = await fetch(`/api/teacher-availability?teacherId=${teacherId}`);
      if (availResponse.ok) {
        const availData = await availResponse.json();
        setSlots(availData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teacher availability',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teacherId]);

  const addSlot = () => {
    const newSlot: AvailabilitySlot = {
      id: `temp-${Date.now()}`,
      teacherId: teacherId || '',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
      isRecurring: true,
      notes: '',
    };
    setSlots([...slots, newSlot]);
    setHasChanges(true);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updatedSlots = slots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    setSlots(updatedSlots);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!teacherId) return;

    setSaving(true);
    try {
      // Use the bulk availability endpoint to set all slots for this teacher
      const response = await fetch('/api/teacher-availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherIds: [teacherId],
          availability: slots.map(slot => ({
            id: slot.id.startsWith('temp-') ? undefined : slot.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isRecurring: slot.isRecurring,
            notes: slot.notes,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save availability');
      }

      toast({
        title: 'Success',
        description: 'Teacher availability updated successfully',
      });

      setHasChanges(false);
      await fetchData(); // Reload data

    } catch (error: any) {
      console.error('Error saving availability:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save availability',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

  // Sort slots by start time within each day
  Object.keys(slotsByDay).forEach(day => {
    slotsByDay[parseInt(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  if (loading) {
    return (
      <div className="space-y-10">
        <header className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
        </header>
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full animate-pulse rounded bg-gray-200" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold text-black">Teacher Not Found</h1>
        <p className="text-gray-600">The requested teacher could not be found.</p>
        <Link href="/dashboard/admin/teachers">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teachers
          </Button>
        </Link>
      </div>
    );
  }

  const breadcrumbs = [
    ...createBreadcrumbs.teachers(),
    { label: teacher.name, href: `/dashboard/admin/teachers/${teacherId}` },
    { label: 'Availability', icon: <Clock className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black flex items-center gap-3">
              <Clock className="h-8 w-8 text-gray-600" />
              Manage Availability
            </h1>
            <p className="text-sm text-gray-600">
              Set weekly availability schedule for {teacher.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/admin/teachers/${teacherId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Link>
            </Button>
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} className="bg-black hover:bg-gray-800">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Slots
              </CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{slots.length}</p>
              <p className="text-xs text-gray-500">Availability windows</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Active Days
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{Object.keys(slotsByDay).length}</p>
              <p className="text-xs text-gray-500">Days with availability</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </CardTitle>
              {slots.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
            </CardHeader>
            <CardContent>
              <Badge
                variant={slots.length > 0 ? 'default' : 'secondary'}
                className={slots.length > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
              >
                {slots.length > 0 ? 'Configured' : 'Not Set'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Availability Slots */}
      <Card className="rounded-2xl border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-black">Availability Slots</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Define when {teacher.name} is available for teaching assignments
              </CardDescription>
            </div>
            <Button onClick={addSlot} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {slots.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No availability slots</h3>
              <p className="text-gray-600 mb-4">
                Add availability slots to define when this teacher can teach.
              </p>
              <Button onClick={addSlot}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Slot
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {slots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  {/* Day of Week */}
                  <div className="flex-shrink-0 w-full sm:w-40">
                    <Label htmlFor={`day-${index}`} className="text-xs text-gray-600 mb-1">
                      Day
                    </Label>
                    <select
                      id={`day-${index}`}
                      value={slot.dayOfWeek}
                      onChange={(e) => updateSlot(index, 'dayOfWeek', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Time */}
                  <div className="flex-shrink-0 w-full sm:w-32">
                    <Label htmlFor={`start-${index}`} className="text-xs text-gray-600 mb-1">
                      Start
                    </Label>
                    <Input
                      id={`start-${index}`}
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* End Time */}
                  <div className="flex-shrink-0 w-full sm:w-32">
                    <Label htmlFor={`end-${index}`} className="text-xs text-gray-600 mb-1">
                      End
                    </Label>
                    <Input
                      id={`end-${index}`}
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Notes */}
                  <div className="flex-1 w-full">
                    <Label htmlFor={`notes-${index}`} className="text-xs text-gray-600 mb-1">
                      Notes (optional)
                    </Label>
                    <Input
                      id={`notes-${index}`}
                      type="text"
                      placeholder="e.g., Morning only"
                      value={slot.notes || ''}
                      onChange={(e) => updateSlot(index, 'notes', e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Recurring Checkbox */}
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <Label className="text-xs text-gray-600 mb-1 block">Recurring</Label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={slot.isRecurring}
                        onChange={(e) => updateSlot(index, 'isRecurring', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600">Weekly</span>
                    </label>
                  </div>

                  {/* Delete Button */}
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <Label className="text-xs text-transparent mb-1 block">Action</Label>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSlot(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Overview */}
      {slots.length > 0 && (
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-black">Weekly Overview</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Visual summary of availability across the week
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DAYS_OF_WEEK.map(day => {
                const daySlots = slotsByDay[day.value] || [];
                return (
                  <Card key={day.value} className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-black">{day.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {daySlots.length === 0 ? (
                        <p className="text-sm text-gray-500">Not available</p>
                      ) : (
                        <div className="space-y-2">
                          {daySlots.map((slot, idx) => (
                            <div key={idx} className="text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-gray-900">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                {slot.isRecurring && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                    Weekly
                                  </Badge>
                                )}
                              </div>
                              {slot.notes && (
                                <p className="text-xs text-gray-500 mt-1">{slot.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

