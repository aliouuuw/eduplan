'use client';

import * as React from 'react';
import { Copy, Trash2 } from 'lucide-react';
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
import { deleteInvitationAction } from './actions';

// Per-row actions: copy the link of a pending invitation, delete one that was not accepted.
export function InvitationActions({ id, email, link, canDelete }: { id: string; email: string; link: string | null; canDelete: boolean }) {
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex items-center gap-1">
      {link && (
        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(link); toast.success('Lien copié'); }}>
          <Copy />
          Copier le lien
        </Button>
      )}
      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Supprimer l'invitation de ${email}`} title="Supprimer" loading={pending}>
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette invitation ?</AlertDialogTitle>
              <AlertDialogDescription>Le lien envoyé à {email} ne fonctionnera plus.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-none bg-now-soft text-now-ink shadow-none hover:bg-now-soft-hover"
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteInvitationAction(id);
                    if (res.ok) toast.success('Invitation supprimée');
                    else toast.error(res.error);
                  })
                }
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
