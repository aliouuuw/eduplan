'use client';

import * as React from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { setCurrentYearAction, setTermClosedAction } from './actions';

// Both actions change what every teacher sees, so each one asks first.
function Confirm({ label, title, body, confirm, run }: { label: string; title: string; body: string; confirm: string; run: () => Promise<{ ok: boolean; error?: string }> }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" loading={pending}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const res = await run();
                if (!res.ok) toast.error(res.error);
              })
            }
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MakeCurrent({ id, name }: { id: string; name: string }) {
  return (
    <Confirm
      label="Définir comme année en cours"
      title={`Passer à l'année ${name} ?`}
      body="Les enseignants verront les classes et les trimestres de cette année sur leur accueil."
      confirm="Changer d'année"
      run={() => setCurrentYearAction(id)}
    />
  );
}

export function TermClose({ id, name, closed }: { id: string; name: string; closed: boolean }) {
  return closed ? (
    <Confirm
      label="Rouvrir"
      title={`Rouvrir ${name} ?`}
      body="Les enseignants pourront de nouveau saisir et modifier les notes de ce trimestre."
      confirm="Rouvrir"
      run={() => setTermClosedAction(id, false)}
    />
  ) : (
    <Confirm
      label="Clôturer"
      title={`Clôturer ${name} ?`}
      body="Après le conseil de classe : les notes et appréciations de ce trimestre passent en lecture seule. Vous pourrez le rouvrir."
      confirm="Clôturer"
      run={() => setTermClosedAction(id, true)}
    />
  );
}
