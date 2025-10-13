# Weekly Hours Refactoring - Per-Class Assignment

**Date**: October 13, 2025
**Status**: ✅ Complete

## Overview

Refactored the weekly hours system to be class-specific rather than global, accurately reflecting that a subject can have different weekly hours in different classes.

## Problem Identified

The previous implementation stored `weeklyHours` globally on the `subjects` table. However, in real-world scenarios, the same subject (e.g., Mathematics) may require different weekly hours depending on the class:
- Mathematics in CM2 A: 5 hours/week
- Mathematics in CM2 B: 4 hours/week (adapted schedule)

This flexibility is essential for accurate timetable scheduling and teacher workload calculations.

## Solution Implemented

### 1. Schema Changes

**Added `weeklyHours` field to `teacherClasses` table**:
```typescript
// src/db/schema.ts
export const teacherClasses = sqliteTable('teacher_classes', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  schoolId: text('school_id').notNull(),
  weeklyHours: integer('weekly_hours').default(0), // NEW: Class-specific weekly hours
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

**Migration**: `0007_yellow_iron_patriot.sql`
```sql
ALTER TABLE `teacher_classes` ADD `weekly_hours` integer DEFAULT 0;
```

### 2. Database Seeding Updates

**Updated `scripts/seed-timetable-data.ts`**:
- Modified teacher-class assignment creation to include `weeklyHours` from subject definition
- Added informative console output about class-specific weekly hours
- Each assignment now has: `teacherId + classId + subjectId + weeklyHours`

Example:
```typescript
await db.insert(teacherClasses).values({
  id: generateId(),
  teacherId: teacherIds[teacher.name],
  classId: classIds[className],
  subjectId: subjectIds[subject.name],
  schoolId: schoolId,
  weeklyHours: subject.weeklyHours, // Class-specific weekly hours
  createdAt: now,
});
```

### 3. API Updates

**Created new endpoint**: `src/app/api/dashboard/admin/teachers/route.ts`
- Returns teachers with accurate statistics
- Calculates `totalWeeklyLoad` from the sum of all class-subject assignments
- Provides counts for assigned subjects and classes

**Teacher statistics calculation**:
```typescript
// Calculate total weekly teaching load from class-subject assignments
const weeklyLoadResult = await db
  .select({
    totalHours: sql<number>`coalesce(sum(${teacherClasses.weeklyHours}), 0)`
  })
  .from(teacherClasses)
  .where(eq(teacherClasses.teacherId, teacher.id));
```

### 4. Frontend Updates

**Updated `src/app/dashboard/admin/teachers/page.tsx`**:
- Now fetches teachers from the new statistics endpoint
- Displays accurate subject counts, class counts, and weekly teaching loads
- Fixed the empty state issue (teachers now display correctly)

## Migration Process

1. **Schema Update**: Added `weeklyHours` column to `teacherClasses` table
2. **Manual Migration**: Created `scripts/apply-migration.ts` to safely apply the migration
3. **Data Seeding**: Updated seeding script to populate the new field
4. **API Refactoring**: Created new endpoint for teacher statistics
5. **Frontend Update**: Updated teachers page to use new endpoint

## Files Changed

### Schema & Database
- `src/db/schema.ts` - Added `weeklyHours` to `teacherClasses`
- `src/db/migrations/0007_yellow_iron_patriot.sql` - Migration file
- `scripts/apply-migration.ts` - Manual migration runner (NEW)
- `scripts/seed-timetable-data.ts` - Updated to populate weekly hours

### API
- `src/app/api/dashboard/admin/teachers/route.ts` - New endpoint for teacher statistics

### Frontend
- `src/app/dashboard/admin/teachers/page.tsx` - Simplified and fixed data fetching

## Testing Checklist

- [x] Database migration applied successfully
- [x] Seeding script creates teacher-class assignments with weekly hours
- [x] Teachers list displays correctly with accurate counts
- [x] Teacher weekly load calculation is accurate
- [x] No linter errors

## Benefits

1. **Accurate Data Model**: Weekly hours are now class-specific, reflecting real-world requirements
2. **Flexible Scheduling**: Each class can have different hour quotas for the same subject
3. **Precise Workload Calculation**: Teacher weekly loads are calculated from actual assignments
4. **Better Timetable Generation**: Auto-scheduler can use accurate weekly hour requirements per class

## Future Enhancements

1. **UI for Editing Weekly Hours**: Add interface to modify weekly hours for specific class-subject assignments
2. **Weekly Hours Validation**: Ensure total weekly hours per class don't exceed available time slots
3. **Teacher Load Balancing**: Visual indicators for overloaded/underloaded teachers
4. **Historical Tracking**: Track changes to weekly hours over time

## Migration Instructions (For Reference)

If you need to apply this migration to an existing database:

```bash
# Apply the migration
bun scripts/apply-migration.ts

# Reset and reseed with new data structure
bun scripts/reset-database.ts
bun scripts/seed-timetable-data.ts
```

## Notes

- The `subjects.weeklyHours` field is kept for backward compatibility and as a default/reference value
- Actual scheduling now uses `teacherClasses.weeklyHours` for precise calculations
- This change does not affect existing timetable entries (they reference time slots independently)

---

**Previous Issues Resolved**:
1. ✅ Teachers page showing empty despite seeded data
2. ✅ Teacher statistics (subjects/classes taught) showing as 0
3. ✅ Weekly hours not reflecting class-specific requirements

