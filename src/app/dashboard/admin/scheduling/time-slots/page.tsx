'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Clock, Calendar, Coffee, BookOpen, AlertTriangle, Layers } from 'lucide-react';
import { TimeSlotForm } from '@/components/forms/time-slot-form';
import Link from 'next/link';

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

interface TimeSlotTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  slotCount: number;
  classCount: number;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function AdminTimeSlotsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [templates, setTemplates] = useState<TimeSlotTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/time-slot-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
        
        // Set default template or first template as selected
        const defaultTemplate = data.templates.find((t: TimeSlotTemplate) => t.isDefault);
        const initialTemplate = defaultTemplate || data.templates[0];
        
        // Check if templateId is in URL params
        const urlTemplateId = searchParams?.get('templateId');
        if (urlTemplateId) {
          setSelectedTemplateId(urlTemplateId);
        } else if (initialTemplate) {
          setSelectedTemplateId(initialTemplate.id);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchTimeSlots = async (templateId?: string) => {
    try {
      const url = templateId 
        ? `/api/time-slots?templateId=${templateId}`
        : '/api/time-slots';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.slots);
      } else {
        throw new Error('Failed to fetch time slots');
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load time slots',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      fetchTimeSlots(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const handleCreateTimeSlot = async (data: any) => {
    try {
      const response = await fetch('/api/time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, templateId: selectedTemplateId }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Time slot created successfully',
        });
        setShowForm(false);
        fetchTimeSlots(selectedTemplateId);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create time slot');
      }
    } catch (error: any) {
      console.error('Error creating time slot:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create time slot',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTimeSlot = async (data: any) => {
    if (!editingTimeSlot) return;

    try {
      const response = await fetch(`/api/time-slots/${editingTimeSlot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Time slot updated successfully',
        });
        setShowForm(false);
        setEditingTimeSlot(null);
        fetchTimeSlots(selectedTemplateId);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update time slot');
      }
    } catch (error: any) {
      console.error('Error updating time slot:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update time slot',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTimeSlot = async (timeSlotId: string) => {
    if (!confirm('Are you sure you want to delete this time slot? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/time-slots/${timeSlotId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Time slot deleted successfully',
        });
        fetchTimeSlots(selectedTemplateId);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete time slot');
      }
    } catch (error: any) {
      console.error('Error deleting time slot:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete time slot',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      key: 'dayOfWeek' as keyof TimeSlot,
      label: 'Day',
      render: (_value: any, item: TimeSlot) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-black">{DAYS_OF_WEEK[item.dayOfWeek]}</span>
        </div>
      ),
    },
    {
      key: 'name' as keyof TimeSlot,
      label: 'Name',
      render: (_value: any, item: TimeSlot) => (
        <div className="flex items-center space-x-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            item.isBreak ? 'bg-orange-100' : 'bg-blue-100'
          }`}>
            {item.isBreak ? (
              <Coffee className="h-4 w-4 text-orange-600" />
            ) : (
              <BookOpen className="h-4 w-4 text-blue-600" />
            )}
          </div>
          <span className="font-medium text-black">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'startTime' as keyof TimeSlot,
      label: 'Time',
      render: (_value: any, item: TimeSlot) => (
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 font-mono">
            {item.startTime} - {item.endTime}
          </span>
        </div>
      ),
    },
    {
      key: 'isBreak' as keyof TimeSlot,
      label: 'Type',
      render: (_value: any, item: TimeSlot) => (
        <Badge 
          variant={item.isBreak ? "secondary" : "default"}
          className={item.isBreak 
            ? "bg-orange-100 text-orange-700 border-orange-200" 
            : "bg-blue-100 text-blue-700 border-blue-200"
          }
        >
          {item.isBreak ? 'Break' : 'Teaching'}
        </Badge>
      ),
    },
    {
      key: 'createdAt' as keyof TimeSlot,
      label: 'Created',
      render: (_value: any, item: TimeSlot) => (
        <span className="text-sm text-gray-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'id' as keyof TimeSlot,
      label: 'Actions',
      render: (_value: any, item: TimeSlot) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingTimeSlot(item);
              setShowForm(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeleteTimeSlot(item.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    totalSlots: timeSlots.length,
    teachingSlots: timeSlots.filter(s => !s.isBreak).length,
    breakSlots: timeSlots.filter(s => s.isBreak).length,
    daysWithSlots: new Set(timeSlots.map(s => s.dayOfWeek)).size,
  };

  // Group slots by day for display
  const slotsByDay = timeSlots.reduce((acc, slot) => {
    const day = slot.dayOfWeek;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, TimeSlot[]>);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black">Time Slots</h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Manage your school's daily schedule template with teaching periods and breaks
            </p>
          </div>
          <Link href="/dashboard/admin/scheduling/templates">
            <Button variant="outline">
              <Layers className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
          </Link>
        </div>

        {/* Template Selector */}
        {templates.length > 0 && (
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Schedule Template
                  </label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            {template.isDefault && (
                              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
                                Default
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedTemplate.description || `${selectedTemplate.slotCount} time slots • ${selectedTemplate.classCount} classes`}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </header>

      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Slots</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats.totalSlots}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Teaching Periods</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                <BookOpen className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats.teachingSlots}</p>
              <p className="text-xs text-gray-500">Available for scheduling</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Break Periods</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                <Coffee className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats.breakSlots}</p>
              <p className="text-xs text-gray-500">Rest and meal times</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Days</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                <Calendar className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{stats.daysWithSlots}</p>
              <p className="text-xs text-gray-500">Days with scheduled slots</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Weekly Schedule Overview */}
      {Object.keys(slotsByDay).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-black">Weekly Schedule Overview</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6, 7].map(day => {
              const daySlots = slotsByDay[day] || [];
              if (daySlots.length === 0) return null;
              
              return (
                <Card key={day} className="rounded-2xl border border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{DAYS_OF_WEEK[day]}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {daySlots
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map(slot => (
                        <div key={slot.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            {slot.isBreak ? (
                              <Coffee className="h-3 w-3 text-orange-500" />
                            ) : (
                              <BookOpen className="h-3 w-3 text-blue-500" />
                            )}
                            <span className="font-medium">{slot.name}</span>
                          </div>
                          <span className="text-gray-500 font-mono">
                            {slot.startTime}-{slot.endTime}
                          </span>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-gray-200 pb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-black">All Time Slots</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Create and manage your school's daily schedule template with teaching periods and breaks.
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-black hover:bg-gray-800 sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Time Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={timeSlots}
            loading={loading}
            searchPlaceholder="Search time slots..."
          />
        </CardContent>
      </section>

      <TimeSlotForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingTimeSlot(null);
        }}
        timeSlot={editingTimeSlot}
        onSubmit={editingTimeSlot ? handleUpdateTimeSlot : handleCreateTimeSlot}
        loading={false}
      />
    </div>
  );
}
