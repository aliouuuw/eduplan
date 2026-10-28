'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { gradeSubmission, type GradeFailure } from '@/lib/data/grading';
import { db } from '@/lib/db';
import { schoolViewerFor } from '@/lib/session';

const input = z.object({
  submissionId: z.string().min(1),
  grade: z.string().max(10),
  comment: z.string().max(2000),
});

const MESSAGE: Record<GradeFailure, string> = {
  not_found: 'Copie introuvable dans vos classes.',
  no_term: "La date de ce devoir n'est dans aucun trimestre.",
  closed: 'Ce trimestre est clôturé : les notes ne peuvent plus changer.',
  invalid_grade: 'Note invalide : un nombre entre 0 et le barème, au quart de point (ex. 11,5).',
};

export async function gradeAction(raw: z.input<typeof input>): Promise<ActionResult> {
  const viewer = await schoolViewerFor('teacher');
  if (!viewer) return fail("Vous n'avez pas accès à cette copie.");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return fail('Saisie invalide.');

  const result = await gradeSubmission(db, { teacherId: viewer.userId, schoolId: viewer.schoolId, ...parsed.data });
  if (!result.ok) return fail(MESSAGE[result.reason]);
  revalidatePath('/dashboard/teacher', 'layout'); // the home's "À corriger" counts change too
  return ok(undefined);
}
