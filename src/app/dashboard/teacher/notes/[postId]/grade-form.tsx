'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { gradeAction } from '../actions';

// The grading panel: one number, one comment, then straight to the next copy (mock: correction).
export function GradeForm({
  submissionId,
  student,
  max,
  grade,
  comment,
  next,
}: {
  submissionId: string;
  student: string;
  max: number;
  grade: number | null;
  comment: string | null;
  next: { href: string; student: string } | null;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(grade === null ? '' : String(grade).replace('.', ','));
  const [text, setText] = React.useState(comment ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await gradeAction({ submissionId, grade: value, comment: text });
      if (!res.ok) return setError(res.error);
      toast.success(`Copie de ${student} rendue`);
      if (next) router.push(next.href);
    });
  };

  const first = student.split(' ')[0];
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="grade">Note sur {max}</Label>
        <div className="flex items-baseline gap-2">
          <input
            id="grade"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'grade-error' : undefined}
            placeholder="–"
            className="font-display w-[5.5ch] rounded-[20px] bg-progress-faint px-3.5 py-1.5 text-[56px] leading-none tracking-[-0.04em] tabular-nums shadow-[inset_0_0_0_1.5px_var(--progress)] outline-none focus-visible:shadow-[inset_0_0_0_2.5px_var(--progress)]"
          />
          <span className="text-xl text-muted-foreground">/ {max}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="comment">Commentaire pour {first}</Label>
        <Textarea id="comment" rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <p id="grade-error" role="alert" className="text-[13.5px] text-now-ink">{error}</p>}
      <Button type="submit" loading={pending} className="w-full">
        {next ? `Rendre et passer à ${next.student.split(' ')[0]}` : 'Rendre la copie'}
      </Button>
      <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Kbd>Entrée</Kbd> dans la note : rendre{next ? ' et suivante' : ''}
      </p>
    </form>
  );
}
