import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../db/schema';
import { generateId } from './utils';

// Create the Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Create the Drizzle database instance
export const db = drizzle(client, { schema });

// Export types
export type Database = typeof db;
export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;
export type School = typeof schema.schools.$inferSelect;
export type NewSchool = typeof schema.schools.$inferInsert;
export type Class = typeof schema.classes.$inferSelect;
export type NewClass = typeof schema.classes.$inferInsert;
export type Subject = typeof schema.subjects.$inferSelect;
export type NewSubject = typeof schema.subjects.$inferInsert;
export type ClassGroup = typeof schema.academicLevels.$inferSelect; // Renamed type
export type NewClassGroup = typeof schema.academicLevels.$inferInsert; // Renamed type
export type AcademicLevel = typeof schema.academicLevels.$inferSelect; // Alias for backward compatibility
export type TimeSlot = typeof schema.timeSlots.$inferSelect;
export type NewTimeSlot = typeof schema.timeSlots.$inferInsert;
export type Timetable = typeof schema.timetables.$inferSelect;
export type NewTimetable = typeof schema.timetables.$inferInsert;
export type StudentEnrollment = typeof schema.studentEnrollments.$inferSelect;
export type NewStudentEnrollment = typeof schema.studentEnrollments.$inferInsert;
export type ParentStudent = typeof schema.parentStudents.$inferSelect;
export type NewParentStudent = typeof schema.parentStudents.$inferInsert;
export type TeacherSubject = typeof schema.teacherSubjects.$inferSelect;
export type NewTeacherSubject = typeof schema.teacherSubjects.$inferInsert;
export type TeacherClass = typeof schema.teacherClasses.$inferSelect;
export type NewTeacherClass = typeof schema.teacherClasses.$inferInsert;
export type Invitation = typeof schema.invitations.$inferSelect;
export type NewInvitation = typeof schema.invitations.$inferInsert;

// Export utilities
export { generateId };

// Role type for better type safety
export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'parent' | 'student';

// Utility function to generate IDs

// Utility function to get current timestamp
export function getCurrentTimestamp(): Date {
  return new Date();
}
