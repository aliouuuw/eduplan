'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Clock,
  Users,
  Calendar,
  Star,
  Edit,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { TimeSlotTemplateForm } from '@/components/forms/time-slot-template-form';
import Link from 'next/link';

interface TimeSlotTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  slotCount: number;
  classCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function TimeSlotTemplatesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TimeSlotTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TimeSlotTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/time-slot-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      } else {
        throw new Error('Failed to fetch templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (data: any) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/time-slot-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
        setShowForm(false);
        fetchTemplates();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create template');
      }
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTemplate = async (data: any) => {
    if (!editingTemplate) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/time-slot-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
        setShowForm(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update template');
      }
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/time-slot-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Template deleted successfully',
        });
        fetchTemplates();
      } else {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to delete template');
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const response = await fetch(`/api/time-slot-templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Default template updated',
        });
        fetchTemplates();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update template');
      }
    } catch (error: any) {
      console.error('Error setting default:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set default template',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-black">Time Slot Templates</h1>
            <p className="max-w-2xl text-sm text-gray-600">
              Create and manage schedule templates that can be assigned to different classes
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingTemplate(null);
              setShowForm(true);
            }}
            className="bg-black hover:bg-gray-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </header>

      {/* Stats Section */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Templates
              </CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">{templates.length}</p>
              <p className="text-xs text-gray-500">Active schedule templates</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Classes Using Templates
              </CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">
                {templates.reduce((sum, t) => sum + t.classCount, 0)}
              </p>
              <p className="text-xs text-gray-500">Total class assignments</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Time Slots
              </CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-black">
                {templates.reduce((sum, t) => sum + t.slotCount, 0)}
              </p>
              <p className="text-xs text-gray-500">Across all templates</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-2xl border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="h-32 animate-pulse rounded bg-gray-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
            <CardContent className="p-12">
              <div className="text-center space-y-3">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-700">No Templates Yet</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Create your first schedule template to organize time slots for different class levels.
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-black hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
                        {template.name}
                        {template.isDefault && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1 text-sm text-gray-600">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-semibold text-black">{template.slotCount}</p>
                        <p className="text-xs text-gray-500">Time Slots</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-semibold text-black">{template.classCount}</p>
                        <p className="text-xs text-gray-500">Classes</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                    <Link href={`/dashboard/admin/scheduling/time-slots?templateId=${template.id}`} className="flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        View Slots
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowForm(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {!template.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(template.id)}
                        title="Set as default"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <TimeSlotTemplateForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
        loading={submitting}
      />
    </div>
  );
}

