'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Copy, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Class {
  id: string;
  name: string;
  academicYear: string;
}

interface CloneSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetClassId: string;
  targetClassName: string;
  availableClasses: Class[];
  onSuccess?: () => void;
}

export function CloneSubjectsDialog({
  open,
  onOpenChange,
  targetClassId,
  targetClassName,
  availableClasses,
  onSuccess,
}: CloneSubjectsDialogProps) {
  const { toast } = useToast();
  const [sourceClassId, setSourceClassId] = useState('');
  const [cloneTeachers, setCloneTeachers] = useState(true);
  const [cloneWeeklyHours, setCloneWeeklyHours] = useState(true);
  const [skipConflicts, setSkipConflicts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleClone = async () => {
    if (!sourceClassId) {
      toast({
        title: 'Error',
        description: 'Please select a source class',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/classes/${targetClassId}/clone-subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceClassId,
          cloneTeachers,
          cloneWeeklyHours,
          skipConflicts,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.details);
        toast({
          title: 'Success',
          description: `Cloned ${data.cloned} subject(s)${data.skipped > 0 ? `, skipped ${data.skipped}` : ''}`,
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(data.error || 'Failed to clone subjects');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSourceClassId('');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clone Subject Assignments
          </DialogTitle>
          <DialogDescription>
            Copy subject and teacher assignments from another class to <strong>{targetClassName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sourceClass">Source Class</Label>
            <Select
              value={sourceClassId}
              onValueChange={setSourceClassId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class to copy from" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses
                  .filter((c) => c.id !== targetClassId)
                  .map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} ({classItem.academicYear})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t pt-3">
            <Label>Clone Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cloneTeachers"
                checked={cloneTeachers}
                onCheckedChange={(checked) => setCloneTeachers(checked as boolean)}
                disabled={loading}
              />
              <label
                htmlFor="cloneTeachers"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Clone teacher assignments
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cloneWeeklyHours"
                checked={cloneWeeklyHours}
                onCheckedChange={(checked) => setCloneWeeklyHours(checked as boolean)}
                disabled={loading}
              />
              <label
                htmlFor="cloneWeeklyHours"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Clone weekly hours
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipConflicts"
                checked={skipConflicts}
                onCheckedChange={(checked) => setSkipConflicts(checked as boolean)}
                disabled={loading}
              />
              <label
                htmlFor="skipConflicts"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Skip subjects already assigned
              </label>
            </div>
          </div>

          {result && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Clone Results:</p>
                  {result.cloned.length > 0 && (
                    <div>
                      <p className="text-sm text-green-600 font-medium">Cloned ({result.cloned.length}):</p>
                      <ul className="text-sm list-disc list-inside">
                        {result.cloned.map((item: any, idx: number) => (
                          <li key={idx}>
                            {item.subjectName}
                            {item.teacherName && ` - ${item.teacherName}`}
                            {item.weeklyHours > 0 && ` (${item.weeklyHours}h/week)`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.skipped.length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Skipped ({result.skipped.length}):</p>
                      <ul className="text-sm list-disc list-inside">
                        {result.skipped.map((item: any, idx: number) => (
                          <li key={idx}>
                            {item.subjectName} - {item.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleClone} disabled={loading || !sourceClassId}>
              {loading ? 'Cloning...' : 'Clone Subjects'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

