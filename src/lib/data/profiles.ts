// Which Neon Auth login opens which EduPlan profile (D49). auth(), the sign-in action and the invitation
// accept all go through here, so the rule has one home.
import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';

import { users } from '@/db/schema';
import type { Database } from '@/lib/db';

/**
 * The active profile linked to this login, or null. Matched on auth_user_id, never on email: anyone can
 * sign up with an email that has a profile, so an email match would hand them that account.
 */
export async function profileForAuthUser(db: Database, authUserId: string) {
  const [profile] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, schoolId: users.schoolId })
    .from(users)
    .where(and(eq(users.authUserId, authUserId), eq(users.isActive, true), isNull(users.deletedAt)))
    .limit(1);
  return profile ?? null;
}
