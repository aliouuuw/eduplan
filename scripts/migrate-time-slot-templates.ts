/**
 * Migration Script: Time Slot Templates
 * 
 * This script creates a default time slot template for each school
 * and associates all existing time slots with that template.
 * 
 * Run with: bun run scripts/migrate-time-slot-templates.ts
 */

import { db } from '../src/lib/db';
import { timeSlotTemplates, timeSlots, schools } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function migrateTimeSlotTemplates() {
  console.log('🚀 Starting Time Slot Templates Migration...\n');

  try {
    // Get all schools
    const allSchools = await db.select().from(schools);
    console.log(`📋 Found ${allSchools.length} school(s)\n`);

    for (const school of allSchools) {
      console.log(`\n🏫 Processing: ${school.name} (${school.schoolCode})`);

      // Check if school already has templates
      const existingTemplates = await db
        .select()
        .from(timeSlotTemplates)
        .where(eq(timeSlotTemplates.schoolId, school.id));

      if (existingTemplates.length > 0) {
        console.log(`  ✓ Already has ${existingTemplates.length} template(s), skipping...`);
        continue;
      }

      // Get existing time slots for this school
      const existingTimeSlots = await db
        .select()
        .from(timeSlots)
        .where(eq(timeSlots.schoolId, school.id));

      console.log(`  📅 Found ${existingTimeSlots.length} existing time slot(s)`);

      // Create default template
      const templateId = nanoid();
      const now = new Date();

      // Get the first admin for this school (as creator)
      // If no admin, we'll use the first user from any role
      const schoolUsers = await db.query.users.findMany({
        where: (users, { eq }) => eq(users.schoolId, school.id),
      });

      const adminUser = schoolUsers.find(u => u.role === 'admin') || schoolUsers[0];

      if (!adminUser) {
        console.log(`  ⚠️  No users found for school, skipping...`);
        continue;
      }

      await db.insert(timeSlotTemplates).values({
        id: templateId,
        schoolId: school.id,
        name: 'Default Schedule',
        description: 'Automatically created from existing time slots',
        isDefault: true,
        isActive: true,
        createdBy: adminUser.id,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`  ✓ Created default template: "Default Schedule"`);

      // Update all existing time slots to reference this template
      if (existingTimeSlots.length > 0) {
        for (const slot of existingTimeSlots) {
          await db
            .update(timeSlots)
            .set({ templateId })
            .where(eq(timeSlots.id, slot.id));
        }

        console.log(`  ✓ Associated ${existingTimeSlots.length} time slot(s) with template`);
      }
    }

    console.log('\n\n✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateTimeSlotTemplates()
  .then(() => {
    console.log('👋 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

