// Loads the teacher-home demo school into the configured database, with a login for Aïssatou.
// Run after migrations: bun run seed:demo
import { eq } from 'drizzle-orm';

import { users } from '../src/db/schema';
import { db } from '../src/lib/db';
import { DEMO_SCHOOL_ID, seedDemo } from '../src/lib/data/demo-seed';
import { ensureLogin, seedPassword } from './neon-login';

const EMAIL = 'aissatou.diop@demo.eduplan';

await seedDemo(db);
const authUserId = await ensureLogin(EMAIL, 'Aïssatou Diop', seedPassword());
await db.update(users).set({ authUserId }).where(eq(users.id, 'demo-aissatou'));
console.log(`Demo school ready: ${DEMO_SCHOOL_ID} (Aïssatou Diop, 3ème B, 31 élèves). Login: ${EMAIL} with SEED_PASSWORD`);
