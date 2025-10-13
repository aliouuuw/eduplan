'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Clock, Edit, CheckCircle, AlertCircle, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Teacher {
  id: string;
  name: string;
  email: string;
  availabilityCount: number;
  hasAvailability: boolean;
}

interface AvailabilitySlot {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  notes?: string;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function AdminTeacherAvailabilityPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [individualEditOpen, setIndividualEditOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk edit form state
  const [bulkStartTime, setBulkStartTime] = useState('08:00');
  const [bulkEndTime, setBulkEndTime] = useState('17:00');
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5]); // Monday-Friday

  // Individual edit state
  const [individualSlots, setIndividualSlots] = useState<AvailabilitySlot[]>([]);

  // Fetch teachers with availability info
  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers?includeAvailability=true');
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teachers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual teacher availability
  const fetchTeacherAvailability = async (teacherId: string) => {
    try {
      const response = await fetch(`/api/teacher-availability?teacherId=${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setIndividualSlots(data);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.schoolId) {
      fetchTeachers();
    }
  }, [session?.user?.schoolId]);

  // Bulk save availability for selected teachers
  const handleBulkSave = async () => {
    if (selectedTeachers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one teacher',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const availabilityData = bulkDays.map(day => ({
        dayOfWeek: day,
        startTime: bulkStartTime,
        endTime: bulkEndTime,
      }));

      const response = await fetch('/api/teacher-availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherIds: selectedTeachers,
          availability: availabilityData,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Availability updated for ${selectedTeachers.length} teacher(s)`,
        });
        setBulkEditOpen(false);
        setSelectedTeachers([]);
        fetchTeachers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update availability');
      }
    } catch (error: any) {
      console.error('Error saving bulk availability:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update availability',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Individual teacher availability save
  const handleIndividualSave = async () => {
    if (!editingTeacher) return;

    setSaving(true);
    try {
      const response = await fetch('/api/teacher-availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherIds: [editingTeacher.id],
          availability: individualSlots.map(slot => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            notes: slot.notes,
          })),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Teacher availability updated',
        });
        setIndividualEditOpen(false);
        setEditingTeacher(null);
        fetchTeachers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update availability');
      }
    } catch (error: any) {
      console.error('Error saving availability:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update availability',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openIndividualEdit = async (teacher: Teacher) => {
    setEditingTeacher(teacher);
    await fetchTeacherAvailability(teacher.id);
    setIndividualEditOpen(true);
  };

  const addSlot = () => {
    setIndividualSlots(prev => [...prev, {
      id: `temp-${Date.now()}`,
      teacherId: editingTeacher?.id || '',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
      notes: '',
    }]);
  };

  const removeSlot = (index: number) => {
    setIndividualSlots(prev => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    setIndividualSlots(prev => prev.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  const columns = [
    {
      key: 'name' as keyof Teacher,
      label: 'Teacher',
      render: (_value: any, item: Teacher) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-700" />
          </div>
          <div>
            <p className="font-medium text-black">{item.name}</p>
            <p className="text-sm text-gray-500">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'availabilityCount' as keyof Teacher,
      label: 'Availability',
      render: (_value: any, item: Teacher) => (
        <div className="flex items-center space-x-2">
          {item.hasAvailability ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {item.availabilityCount} slots
              </Badge>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                Not set
              </Badge>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'id' as keyof Teacher,
      label: 'Actions',
      render: (_value: any, item: Teacher) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openIndividualEdit(item)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    totalTeachers: teachers.length,
    teachersWithAvailability: teachers.filter(t => t.hasAvailability).length,
    teachersWithoutAvailability: teachers.filter(t => !t.hasAvailability).length,
    averageSlotsPerTeacher: teachers.length > 0
      ? Math.round(teachers.reduce((sum, t) => sum + t.availabilityCount, 0) / teachers.length)
      : 0,
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">Teacher Availability</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Manage teacher availability schedules for timetable planning and conflict detection
        </p>
      </header>

      {/* Stats Section */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats.totalTeachers}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">With Availability</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats.teachersWithAvailability}</p>
              <p className="text-xs text-gray-500">
                {stats.totalTeachers > 0
                  ? `${Math.round((stats.teachersWithAvailability / stats.totalTeachers) * 100)}% complete`
                  : 'No teachers'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Needs Setup</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats.teachersWithoutAvailability}</p>
              <p className="text-xs text-gray-500">No availability set</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Avg Slots</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats.averageSlotsPerTeacher}</p>
              <p className="text-xs text-gray-500">Per teacher</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bulk Actions */}
      <section className="space-y-4">
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200 pb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-black">Bulk Operations</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Set availability for multiple teachers at once
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={selectedTeachers.length === 0}
                  onClick={() => setBulkEditOpen(true)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Set Availability ({selectedTeachers.length})
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Teachers Table */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-gray-200 pb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-black">All Teachers</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Manage teacher availability schedules for automated timetable generation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={teachers}
            loading={loading}
            searchPlaceholder="Search teachers..."
          />
        </CardContent>
      </section>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span>Bulk Set Availability</span>
            </DialogTitle>
            <DialogDescription>
              Set the same availability schedule for {selectedTeachers.length} selected teacher(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-start">Start Time</Label>
                  <Input
                    id="bulk-start"
                    type="time"
                    value={bulkStartTime}
                    onChange={(e) => setBulkStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-end">End Time</Label>
                  <Input
                    id="bulk-end"
                    type="time"
                    value={bulkEndTime}
                    onChange={(e) => setBulkEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={bulkDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkDays(prev => [...prev, day].sort());
                          } else {
                            setBulkDays(prev => prev.filter(d => d !== day));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{DAYS_OF_WEEK[day]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkSave}
                disabled={saving || selectedTeachers.length === 0}
                className="bg-black hover:bg-gray-800"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : `Set for ${selectedTeachers.length} Teacher${selectedTeachers.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Edit Dialog */}
      <Dialog open={individualEditOpen} onOpenChange={setIndividualEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-blue-500" />
              <span>Edit Availability: {editingTeacher?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Manage detailed availability slots for this teacher
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Availability Slots</p>
              <Button onClick={addSlot} size="sm" variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Add Slot
              </Button>
            </div>

            {individualSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No availability slots set. Click "Add Slot" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {individualSlots.map((slot, index) => (
                  <div key={slot.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <select
                      value={slot.dayOfWeek}
                      onChange={(e) => updateSlot(index, 'dayOfWeek', parseInt(e.target.value))}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      {DAYS_OF_WEEK.map((day, i) => (
                        <option key={i + 1} value={i + 1}>{day}</option>
                      ))}
                    </select>

                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                      className="px-3 py-1 border rounded text-sm"
                    />

                    <span className="text-gray-400">-</span>

                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                      className="px-3 py-1 border rounded text-sm"
                    />

                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={slot.notes || ''}
                      onChange={(e) => updateSlot(index, 'notes', e.target.value)}
                      className="px-3 py-1 border rounded text-sm flex-1"
                    />

                    <Button
                      onClick={() => removeSlot(index)}
                      size="sm"
                      variant="destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndividualEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleIndividualSave}
              disabled={saving}
              className="bg-black hover:bg-gray-800"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Availability'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
