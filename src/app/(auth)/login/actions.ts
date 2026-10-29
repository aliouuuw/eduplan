'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { users } from '@/db/schema';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { db } from '@/lib/db';
import { neonAuth } from '@/lib/neon-auth';

const credentials = z.object({ email: z.string().email(), password: z.string().min(1) });

// Neon Auth checks the password (D49). A login without an active EduPlan profile is signed out again,
// so it cannot sit on a session that every page would refuse.
export async function signInAction(input: z.input<typeof credentials>): Promise<ActionResult> {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) return fail('E-mail ou mot de passe incorrect.');

  const { data, error } = await neonAuth.signIn.email(parsed.data);
  if (error || !data) return fail(error?.status === 401 ? 'E-mail ou mot de passe incorrect.' : 'Connexion impossible. Réessayez.');

  const [profile] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.authUserId, data.user.id), eq(users.isActive, true), isNull(users.deletedAt)))
    .limit(1);
  if (!profile) {
    await neonAuth.signOut();
    return fail("Ce compte n'a pas accès à EduPlan.");
  }
  return ok(undefined);
}
