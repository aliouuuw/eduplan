/**
 * Migration Script: Time Slot Templates
 * 
 * This script creates a default time slot template for each school
 * and associates all existing time slots with that template.
 * 
 * Run with: bun run scripts/migrate-time-slot-templates.ts
 */

import { db } from '../src/lib/db';
import { timeSlotTemplates, timeSlots, schools, classes } from '../src/db/schema';
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

      let templateId: string;

      if (existingTemplates.length > 0) {
        console.log(`  ✓ Already has ${existingTemplates.length} template(s)`);
        
        // Use the first template (or the default one if available)
        const defaultTemplate = existingTemplates.find(t => t.isDefault) || existingTemplates[0];
        templateId = defaultTemplate.id;
        console.log(`  → Using template: "${defaultTemplate.name}"`);

        // Still need to update classes and time slots if they're not associated
      } else {
        // Get existing time slots for this school
        const existingTimeSlots = await db
          .select()
          .from(timeSlots)
          .where(eq(timeSlots.schoolId, school.id));

        console.log(`  📅 Found ${existingTimeSlots.length} existing time slot(s)`);

        // Create default template
        templateId = nanoid();
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
      }

      // Update all existing time slots to reference this template (if not already set)
      const timeSlotsWithoutTemplate = await db
        .select()
        .from(timeSlots)
        .where(eq(timeSlots.schoolId, school.id));

      let updatedSlotsCount = 0;
      for (const slot of timeSlotsWithoutTemplate) {
        if (!slot.templateId) {
          await db
            .update(timeSlots)
            .set({ templateId })
            .where(eq(timeSlots.id, slot.id));
          updatedSlotsCount++;
        }
      }

      if (updatedSlotsCount > 0) {
        console.log(`  ✓ Associated ${updatedSlotsCount} time slot(s) with template`);
      }

      // Update all existing classes to reference this template (if not already set)
      const existingClasses = await db
        .select()
        .from(classes)
        .where(eq(classes.schoolId, school.id));

      let updatedClassesCount = 0;
      for (const classItem of existingClasses) {
        if (!classItem.timeSlotTemplateId) {
          await db
            .update(classes)
            .set({ timeSlotTemplateId: templateId })
            .where(eq(classes.id, classItem.id));
          updatedClassesCount++;
        }
      }

      if (updatedClassesCount > 0) {
        console.log(`  ✓ Associated ${updatedClassesCount} class(es) with template`);
      } else {
        console.log(`  → All classes already have templates assigned`);
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

