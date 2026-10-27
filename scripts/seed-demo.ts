// Loads the teacher-home demo school into the configured database.
// Run after migrations: bun run seed:demo
import { db } from '../src/lib/db';
import { DEMO_SCHOOL_ID, seedDemo } from '../src/lib/data/demo-seed';

await seedDemo(db);
console.log(`Demo school ready: ${DEMO_SCHOOL_ID} (Aïssatou Diop, 3ème B, 31 élèves)`);
