'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { createYear, setCurrentYear, setTermClosed, yearInput } from '@/lib/data/academic-years';
import { db } from '@/lib/db';
import { schoolViewerFor } from '@/lib/session';

const PAGE = '/dashboard/admin/parametres';
const NO_ACCESS = "Vous n'avez pas accès aux réglages de cette école.";
const id = z.string().min(1);

export async function createYearAction(input: z.input<typeof yearInput>): Promise<ActionResult> {
  const viewer = await schoolViewerFor('admin');
  if (!viewer) return fail(NO_ACCESS);
  const parsed = yearInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Saisie invalide.');

  const result = await createYear(db, viewer.schoolId, parsed.data);
  if (!result.ok) {
    return fail(result.reason === 'duplicate_name' ? 'Une année porte déjà ce nom.' : 'Ces dates chevauchent une autre année.');
  }
  revalidatePath(PAGE);
  return ok(undefined);
}

export async function setCurrentYearAction(yearId: string): Promise<ActionResult> {
  const viewer = await schoolViewerFor('admin');
  if (!viewer) return fail(NO_ACCESS);
  const parsed = id.safeParse(yearId);
  if (!parsed.success || !(await setCurrentYear(db, viewer.schoolId, parsed.data))) return fail('Année introuvable.');
  revalidatePath('/dashboard', 'layout'); // every role's home reads the current year
  return ok(undefined);
}

export async function setTermClosedAction(termId: string, closed: boolean): Promise<ActionResult> {
  const viewer = await schoolViewerFor('admin');
  if (!viewer) return fail(NO_ACCESS);
  const parsed = z.object({ termId: id, closed: z.boolean() }).safeParse({ termId, closed });
  if (!parsed.success || !(await setTermClosed(db, viewer.schoolId, parsed.data.termId, parsed.data.closed))) return fail('Trimestre introuvable.');
  revalidatePath('/dashboard', 'layout');
  return ok(undefined);
}
