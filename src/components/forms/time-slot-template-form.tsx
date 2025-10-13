'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  isDefault: z.boolean().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TimeSlotTemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: {
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
  } | null;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  loading?: boolean;
}

export function TimeSlotTemplateForm({
  open,
  onOpenChange,
  template,
  onSubmit,
  loading = false,
}: TimeSlotTemplateFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      isDefault: template?.isDefault || false,
    },
  });

  const handleSubmit = async (data: TemplateFormData) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Error submitting template:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Time Slot Template' : 'Create Time Slot Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Update the template details below.'
              : 'Create a new schedule template that can be assigned to classes.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Primary Schedule, Secondary Full Day" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this schedule template
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., For classes CP through CM2, 8:00-12:30 daily"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional details about when to use this template
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Set as default template
                    </FormLabel>
                    <FormDescription>
                      New classes will automatically use this template if no template is specified
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting || loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || loading}
                className="bg-black hover:bg-gray-800"
              >
                {(submitting || loading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {template ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

