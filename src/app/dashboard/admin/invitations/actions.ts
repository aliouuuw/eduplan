'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { createInvitation, deleteInvitation } from '@/lib/data/invitations';
import { db } from '@/lib/db';
import { getInvitationLink } from '@/lib/invitations';
import { schoolViewerFor } from '@/lib/session';

const PAGE = '/dashboard/admin/invitations';
const NO_ACCESS = "Vous n'avez pas accès aux invitations de cette école.";

const createSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.'),
  role: z.enum(['admin', 'teacher', 'parent', 'student'], { message: 'Choisissez un rôle.' }),
});

export async function createInvitationAction(input: z.input<typeof createSchema>): Promise<ActionResult<{ link: string }>> {
  const viewer = await schoolViewerFor('admin');
  if (!viewer) return fail(NO_ACCESS);
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Saisie invalide.');

  const result = await createInvitation(db, { ...parsed.data, schoolId: viewer.schoolId, createdBy: viewer.userId });
  if (!result.ok) return fail('Une invitation est déjà en attente pour cette adresse.');
  revalidatePath(PAGE);
  return ok({ link: getInvitationLink(result.token) });
}

export async function deleteInvitationAction(id: string): Promise<ActionResult> {
  const viewer = await schoolViewerFor('admin');
  if (!viewer) return fail(NO_ACCESS);
  const result = await deleteInvitation(db, { schoolId: viewer.schoolId, id: z.string().min(1).parse(id) });
  if (!result.ok) {
    return fail(result.reason === 'already_used' ? 'Cette invitation a déjà été acceptée.' : 'Invitation introuvable.');
  }
  revalidatePath(PAGE);
  return ok(undefined);
}
