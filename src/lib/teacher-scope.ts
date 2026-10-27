import { and, eq, isNull, type SQL } from 'drizzle-orm';

import { users } from '@/db/schema';

/** A teacher account that is not soft-deleted. Use it in every teacher list and assignment check. */
export const activeTeacher = (): SQL => and(eq(users.role, 'teacher'), isNull(users.deletedAt))!;
