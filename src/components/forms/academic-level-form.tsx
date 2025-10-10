'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AcademicLevel } from '@/lib/db';

const levelSchema = z.object({
  name: z.string().min(1, 'Level name is required'),
  description: z.string().optional(),
});

type LevelFormData = z.infer<typeof levelSchema>;

interface AcademicLevelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level?: AcademicLevel | null;
  onSubmit: (data: LevelFormData) => Promise<void>;
  loading?: boolean;
}

export function AcademicLevelForm({
  open,
  onOpenChange,
  level,
  onSubmit,
  loading = false
}: AcademicLevelFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LevelFormData>({
    resolver: zodResolver(levelSchema),
    defaultValues: {
      name: level?.name || '',
      description: level?.description || '',
    },
  });

  const handleSubmit = async (data: LevelFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-black">
            {level ? 'Edit Academic Level' : 'Create New Academic Level'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {level
              ? 'Update the academic level information below.'
              : 'Fill in the information to create a new academic level.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">Level Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Primary, Secondary, Grade 1"
                      {...field}
                      disabled={isSubmitting}
                      className="border-gray-300 focus:border-black focus:ring-black"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this academic level"
                      {...field}
                      disabled={isSubmitting}
                      rows={3}
                      className="border-gray-300 focus:border-black focus:ring-black resize-none"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-black hover:bg-gray-800"
              >
                {isSubmitting ? 'Saving...' : level ? 'Update Level' : 'Create Level'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
