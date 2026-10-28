'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createYearAction } from './actions';

type Span = { name: string; startsOn: string; endsOn: string };
const blankTerms = (): Span[] => [1, 2, 3].map((n) => ({ name: `Trimestre ${n}`, startsOn: '', endsOn: '' }));

function Dates({ id, value, onChange }: { id: string; value: Span; onChange: (next: Span) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-start`} className="text-[13px] text-muted-foreground">Début</Label>
        <Input id={`${id}-start`} type="date" required value={value.startsOn} onChange={(e) => onChange({ ...value, startsOn: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-end`} className="text-[13px] text-muted-foreground">Fin</Label>
        <Input id={`${id}-end`} type="date" required value={value.endsOn} onChange={(e) => onChange({ ...value, endsOn: e.target.value })} />
      </div>
    </div>
  );
}

// The page's one primary action: a year comes with its three trimestres, so one form creates all of them.
export function NewYear() {
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState<Span>({ name: '', startsOn: '', endsOn: '' });
  const [terms, setTerms] = React.useState<Span[]>(blankTerms);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // "2027-2028" from the start date, until the admin types a name of their own.
  const changeYear = (next: Span) => {
    const auto = (start: string) => (start ? `${start.slice(0, 4)}-${Number(start.slice(0, 4)) + 1}` : '');
    setYear(year.name === auto(year.startsOn) ? { ...next, name: auto(next.startsOn) } : next);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createYearAction({ ...year, terms });
      if (!res.ok) return setError(res.error);
      setOpen(false);
      setYear({ name: '', startsOn: '', endsOn: '' });
      setTerms(blankTerms());
      toast.success(`Année ${year.name} créée`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nouvelle année
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nouvelle année scolaire</DialogTitle>
            <DialogDescription>Les classes déjà créées avec ce nom d&apos;année y sont rattachées.</DialogDescription>
          </DialogHeader>
          <fieldset className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="year-name">Nom</Label>
              <Input id="year-name" required maxLength={40} value={year.name} onChange={(e) => setYear({ ...year, name: e.target.value })} placeholder="2027-2028" />
            </div>
            <Dates id="year" value={year} onChange={changeYear} />
          </fieldset>
          {terms.map((term, index) => (
            <fieldset key={index} className="flex flex-col gap-2 border-t border-border pt-4">
              <Label htmlFor={`term-${index}-name`} className="sr-only">Nom du trimestre {index + 1}</Label>
              <Input
                id={`term-${index}-name`}
                required
                maxLength={40}
                value={term.name}
                onChange={(e) => setTerms(terms.map((t, i) => (i === index ? { ...t, name: e.target.value } : t)))}
                className="font-medium"
              />
              <Dates id={`term-${index}`} value={term} onChange={(next) => setTerms(terms.map((t, i) => (i === index ? next : t)))} />
            </fieldset>
          ))}
          {error && <p role="alert" className="text-[13.5px] text-now-ink">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" loading={pending}>Créer l&apos;année</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
