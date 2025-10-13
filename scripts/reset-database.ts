#!/usr/bin/env bun
/**
 * Database Reset Script
 * 
 * Safely deletes all school-related data while preserving superadmin accounts.
 * Use this script when you need to clean the database for fresh seeding.
 * 
 * Usage: bun run scripts/reset-database.ts
 */

import { db } from '@/lib/db';
import {
  schools,
  users,
  academicLevels,
  classes,
  subjects,
  timeSlots,
  teacherSubjects,
  teacherClasses,
  teacherAvailability,
  timetables,
  studentEnrollments,
  parentStudents,
  invitations,
  passwordResets,
  passwordResetRequests
} from '@/db/schema';
import { ne } from 'drizzle-orm';

async function resetDatabase() {
  console.log('🗑️  Starting database reset...\n');

  try {
    // Delete in order of dependencies (child tables first)
    console.log('');

    console.log('📋 Deleting timetables...');
    await db.delete(timetables);
    console.log('✅ Timetables deleted');

    console.log('📅 Deleting teacher availability...');
    await db.delete(teacherAvailability);
    console.log('✅ Teacher availability deleted');

    console.log('👨‍🏫 Deleting teacher-class assignments...');
    await db.delete(teacherClasses);
    console.log('✅ Teacher-class assignments deleted');

    console.log('📚 Deleting teacher-subject assignments...');
    await db.delete(teacherSubjects);
    console.log('✅ Teacher-subject assignments deleted');

    console.log('👪 Deleting parent-student relationships...');
    await db.delete(parentStudents);
    console.log('✅ Parent-student relationships deleted');

    console.log('📚 Deleting student enrollments...');
    await db.delete(studentEnrollments);
    console.log('✅ Student enrollments deleted');

    console.log('⏰ Deleting time slots...');
    await db.delete(timeSlots);
    console.log('✅ Time slots deleted');

    console.log('📖 Deleting subjects...');
    await db.delete(subjects);
    console.log('✅ Subjects deleted');

    console.log('🏫 Deleting classes...');
    await db.delete(classes);
    console.log('✅ Classes deleted');

    console.log('🎓 Deleting class groups (academic levels)...');
    await db.delete(academicLevels);
    console.log('✅ Class groups deleted');

    console.log('✉️  Deleting invitations...');
    await db.delete(invitations);
    console.log('✅ Invitations deleted');

    console.log('🔑 Deleting password resets...');
    await db.delete(passwordResets);
    console.log('✅ Password resets deleted');

    console.log('🔑 Deleting password reset requests...');
    await db.delete(passwordResetRequests);
    console.log('✅ Password reset requests deleted');

    console.log('👤 Deleting non-superadmin users...');
    await db.delete(users).where(ne(users.role, 'superadmin'));
    console.log('✅ Non-superadmin users deleted');

    console.log('🏢 Deleting schools...');
    await db.delete(schools);
    console.log('✅ Schools deleted');

    console.log('');
    console.log('✨ Database reset complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('ℹ️  Superadmin accounts have been preserved.');
    console.log('ℹ️  All school data, users, and relationships have been deleted.');
    console.log('');
    console.log('🚀 Next step:');
    console.log('   Run: bun run scripts/seed-timetable-data.ts');
    console.log('   This will populate the database with comprehensive test data.');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Run the script
resetDatabase()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to reset database:', error);
    process.exit(1);
  });

