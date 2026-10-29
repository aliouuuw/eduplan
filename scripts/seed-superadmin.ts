/**
 * Script to create a superadmin account
 * Run: bun run scripts/seed-superadmin.ts
 */
import { db, generateId, getCurrentTimestamp } from '../src/lib/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { ensureLogin } from './neon-login';

const SUPERADMIN_EMAIL = 'superadmin@eduplan.com';
const SUPERADMIN_PASSWORD = 'Admin@123'; // Change this in production!
const SUPERADMIN_NAME = 'System Administrator';

async function seedSuperAdmin() {
  try {
    console.log('🔍 Checking if superadmin already exists...');
    
    // Check if superadmin already exists
    const existingSuperAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, SUPERADMIN_EMAIL))
      .limit(1);

    if (existingSuperAdmin.length > 0) {
      console.log('✅ Superadmin already exists!');
      console.log('Email:', SUPERADMIN_EMAIL);
      console.log('Use this account to login and create schools.');
      return;
    }

    console.log('⚙️  Creating superadmin account...');
    
    const authUserId = await ensureLogin(SUPERADMIN_EMAIL, SUPERADMIN_NAME, SUPERADMIN_PASSWORD);

    // Create superadmin user
    const userId = generateId();
    const now = getCurrentTimestamp();

    await db.insert(users).values({
      id: userId,
      email: SUPERADMIN_EMAIL,
      authUserId,
      name: SUPERADMIN_NAME,
      role: 'superadmin',
      schoolId: null, // Superadmin has no school
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    console.log('✅ Superadmin account created successfully!');
    console.log('');
    console.log('📧 Email:', SUPERADMIN_EMAIL);
    console.log('🔑 Password:', SUPERADMIN_PASSWORD);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('');
    console.log('🚀 You can now login at: http://localhost:3000/login');
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSuperAdmin()
  .then(() => {
    console.log('✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

