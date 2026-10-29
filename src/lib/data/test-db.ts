// Test helper: a fresh in-memory Postgres (PGlite) with the real migrations applied.
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import * as schema from '@/db/schema';
import type { Database } from '@/lib/db';

export async function testDb(queryLog?: string[]): Promise<Database> {
  const db = drizzle({
    client: new PGlite(),
    schema,
    logger: queryLog ? { logQuery(query) { queryLog.push(query); } } : undefined,
  });
  await migrate(db, { migrationsFolder: join(import.meta.dirname, '..', '..', 'db', 'migrations') });
  return db as unknown as Database;
}
