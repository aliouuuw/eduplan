// Test helper: a fresh in-memory database with the real migrations applied.
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

import * as schema from '@/db/schema';
import type { Database } from '@/lib/db';

export async function testDb(queryLog?: string[]): Promise<Database> {
  const db = drizzle(createClient({ url: ':memory:' }), {
    schema,
    logger: queryLog ? { logQuery(query) { queryLog.push(query); } } : undefined,
  });
  await migrate(db, { migrationsFolder: join(import.meta.dirname, '..', '..', 'db', 'migrations') });
  return db as unknown as Database;
}
