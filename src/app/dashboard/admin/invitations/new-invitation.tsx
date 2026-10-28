'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createInvitationAction } from './actions';

const ROLES = [
  { value: 'teacher', label: 'Enseignant' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Élève' },
  { value: 'admin', label: 'Administration' },
] as const;

// The one primary action of the page: invite someone, then copy the link from the toast.
export function NewInvitation({ variant = 'default' }: { variant?: 'default' | 'outline' }) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<string>('teacher');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createInvitationAction({ email, role: role as (typeof ROLES)[number]['value'] });
      if (!res.ok) return setError(res.error);
      setOpen(false);
      setEmail('');
      toast.success(`Invitation créée pour ${email}`, {
        description: 'Le lien est valable 7 jours.',
        action: { label: 'Copier le lien', onClick: () => navigator.clipboard.writeText(res.data.link) },
        duration: 12000,
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus />
          Nouvelle invitation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Inviter une personne</DialogTitle>
            <DialogDescription>Elle recevra un lien pour créer son compte dans votre école.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-email">Adresse e-mail</Label>
            <Input id="inv-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@ecole.sn" aria-invalid={!!error || undefined} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p role="alert" className="text-[13.5px] text-now-ink">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" loading={pending}>Créer l&apos;invitation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
