// Loads the teacher-home demo school into the configured database, with a login for Aïssatou.
// Run after migrations: bun run seed:demo
import { eq } from 'drizzle-orm';

import { users } from '../src/db/schema';
import { db } from '../src/lib/db';
import { DEMO_SCHOOL_ID, seedDemo } from '../src/lib/data/demo-seed';
import { ensureLogin } from './neon-login';

const EMAIL = 'aissatou.diop@demo.eduplan';
const PASSWORD = 'Demo@123';

await seedDemo(db);
const authUserId = await ensureLogin(EMAIL, 'Aïssatou Diop', PASSWORD);
await db.update(users).set({ authUserId }).where(eq(users.id, 'demo-aissatou'));
console.log(`Demo school ready: ${DEMO_SCHOOL_ID} (Aïssatou Diop, 3ème B, 31 élèves). Login: ${EMAIL} / ${PASSWORD}`);
