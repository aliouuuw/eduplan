'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Class } from '@/lib/db';

const classSchema = z.object({
  levelId: z.string().min(1, 'Academic level is required'),
  name: z.string().min(1, 'Class name is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  capacity: z.number().int().min(1).max(100).optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData?: Class | null;
  academicLevels: any[];
  onSubmit: (data: ClassFormData) => Promise<void>;
  loading?: boolean;
}

export function ClassForm({
  open,
  onOpenChange,
  classData,
  academicLevels,
  onSubmit,
  loading = false
}: ClassFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      levelId: classData?.levelId || '',
      name: classData?.name || '',
      academicYear: classData?.academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      capacity: classData?.capacity || 30,
    },
  });

  const handleSubmit = async (data: ClassFormData) => {
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
            {classData ? 'Edit Class' : 'Create New Class'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {classData
              ? 'Update the class information below.'
              : 'Fill in the information to create a new class.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 pt-2">
            <FormField
              control={form.control}
              name="levelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">Academic Level *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300 focus:border-black focus:ring-black">
                        <SelectValue placeholder="Select an academic level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white">
                      {academicLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">Class Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 6ème A, CM2 B, Terminale S"
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
              name="academicYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">Academic Year *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 2024-2025"
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
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-black">Class Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="30"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                      disabled={isSubmitting}
                      className="border-gray-300 focus:border-black focus:ring-black"
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
                {isSubmitting ? 'Saving...' : classData ? 'Update Class' : 'Create Class'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
