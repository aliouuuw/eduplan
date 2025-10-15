<!-- 877d244e-96d6-43cb-8037-16560f3b62b3 e3ad75d8-6c73-4df9-8c42-f5706f126c90 -->
# Subject Page Admin-Focused UX Enhancement

## Overview

Transform the subjects listing page to show what school admins actually need: total teaching load across all classes, assignment coverage status, and teacher availability - replacing the confusing "default weekly hours" template value.

## Phase 1: API Enhancement for Subject Metrics

### 1.1 Add Total Hours Calculation to Subjects API

**File**: `src/app/api/subjects/route.ts`

Enhance the GET endpoint to calculate and return:

- `totalActualHours`: Sum of `weeklyHours` from all `teacherClasses` for each subject
- `assignedClasses`: Count of classes where subject is assigned with a teacher
- `totalClasses`: Total count of classes using this subject (regardless of teacher)

**Implementation**:

```typescript
// For each subject, query teacherClasses to sum actual hours
const subjects = await Promise.all(
  fetchedSubjects.map(async (subject) => {
    const assignments = await db
      .select({ weeklyHours: teacherClasses.weeklyHours })
      .from(teacherClasses)
      .where(eq(teacherClasses.subjectId, subject.id));
    
    const totalActualHours = assignments.reduce((sum, a) => sum + (a.weeklyHours || 0), 0);
    const assignedClasses = assignments.filter(a => a.weeklyHours > 0).length;
    
    return { ...subject, totalActualHours, assignedClasses };
  })
);
```

## Phase 2: Update Subject Interface

### 2.1 Extend SubjectWithUsage Interface

**File**: `src/app/dashboard/admin/subjects/page.tsx`

Add new fields to match admin expectations:

```typescript
interface SubjectWithUsage extends Subject {
  classCount: number;
  teacherCount: number;
  availableTeachers?: number;
  totalActualHours?: number;    // NEW: Sum of all class assignment hours
  assignedClasses?: number;      // NEW: Classes with assigned teachers
  coverage?: number;             // NEW: Percentage of classes with teachers
}
```

## Phase 3: Replace Default Hours Column

### 3.1 Add "Total Teaching Load" Column

**File**: `src/app/dashboard/admin/subjects/page.tsx`

Replace or enhance the existing hours display:

**Current (confusing)**:

```typescript
weeklyHours: 5h  // Default template value
```

**New (admin-focused)**:

```typescript
{
  key: 'teachingLoad',
  label: 'Total Teaching Load',
  render: (_value: any, item: SubjectWithUsage) => (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="font-semibold text-base">
          {item.totalActualHours || 0}h
        </span>
      </div>
      <span className="text-xs text-gray-500">
        per week
      </span>
      {item.classCount > 0 && (
        <span className="text-xs text-gray-400">
          across {item.classCount} classes
        </span>
      )}
      {item.totalActualHours === 0 && item.classCount === 0 && (
        <Badge variant="outline" className="text-xs bg-gray-100">
          Not in use
        </Badge>
      )}
    </div>
  ),
}
```

## Phase 4: Add Coverage Column

### 4.1 Visual Coverage Indicator

**File**: `src/app/dashboard/admin/subjects/page.tsx`

Add new column showing assignment coverage:

```typescript
{
  key: 'coverage',
  label: 'Coverage',
  render: (_value: any, item: SubjectWithUsage) => {
    const coverage = item.classCount > 0 
      ? Math.round(((item.assignedClasses || 0) / item.classCount) * 100)
      : 0;
    
    return (
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                coverage === 100 ? 'bg-green-500' :
                coverage >= 75 ? 'bg-yellow-500' :
                coverage > 0 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${coverage}%` }}
            />
          </div>
          <span className="text-sm font-medium min-w-[3rem]">
            {coverage}%
          </span>
        </div>
        
        {/* Status text */}
        <div className="flex items-center gap-1">
          {coverage === 100 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
              ✓ Fully staffed
            </Badge>
          )}
          {coverage > 0 && coverage < 100 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
              {item.assignedClasses}/{item.classCount} staffed
            </Badge>
          )}
          {coverage === 0 && item.classCount > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
              ⚠ No teachers
            </Badge>
          )}
        </div>
      </div>
    );
  },
}
```

## Phase 5: Update Subject Form Label

### 5.1 Clarify Default Hours Purpose

**File**: `src/components/forms/subject-form.tsx`

Update form field to make the purpose clear:

**Current**:

```typescript
<FormLabel>Weekly Hours</FormLabel>
<FormDescription>
  Number of teaching hours required per week for auto-scheduling
</FormDescription>
```

**New**:

```typescript
<FormLabel>Default Weekly Hours (Template)</FormLabel>
<FormDescription>
  Recommended hours per week used as starting point when assigning to classes.
  Actual hours can be customized per class.
</FormDescription>
```

## Phase 6: Add Status/Alert Badges

### 6.1 Quick Status Indicators

**File**: `src/app/dashboard/admin/subjects/page.tsx`

Add status column or inline badges:

```typescript
{
  key: 'status',
  label: 'Status',
  render: (_value: any, item: SubjectWithUsage) => (
    <div className="flex flex-col gap-1">
      {/* Not in use */}
      {item.classCount === 0 && (
        <Badge variant="outline" className="bg-gray-100 text-gray-600">
          Not in use
        </Badge>
      )}
      
      {/* Need teachers */}
      {item.classCount > 0 && item.availableTeachers === 0 && (
        <Badge variant="destructive" className="text-xs">
          ⚠ Need teachers
        </Badge>
      )}
      
      {/* Understaffed */}
      {item.coverage && item.coverage < 100 && item.coverage > 0 && (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
          Understaffed
        </Badge>
      )}
      
      {/* Good status */}
      {item.coverage === 100 && item.availableTeachers && item.availableTeachers > 0 && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
          ✓ Healthy
        </Badge>
      )}
    </div>
  ),
}
```

## Phase 7: Update Statistics Cards

### 7.1 Admin-Relevant Stats

**File**: `src/app/dashboard/admin/subjects/page.tsx`

Update stats to show actionable metrics:

```typescript
const stats = {
  totalSubjects: subjects.length,
  activeSubjects: subjects.filter(s => s.classCount > 0).length,
  fullyStaffed: subjects.filter(s => s.coverage === 100).length,
  needTeachers: subjects.filter(s => s.classCount > 0 && s.availableTeachers === 0).length,
  totalTeachingHours: subjects.reduce((sum, s) => sum + (s.totalActualHours || 0), 0),
};

// Display cards:
<Card>
  <CardHeader>
    <CardDescription>Active Subjects</CardDescription>
    <CardTitle>{stats.activeSubjects} / {stats.totalSubjects}</CardTitle>
  </CardHeader>
</Card>

<Card>
  <CardHeader>
    <CardDescription>Fully Staffed</CardDescription>
    <CardTitle className="text-green-600">{stats.fullyStaffed}</CardTitle>
  </CardHeader>
</Card>

<Card>
  <CardHeader>
    <CardDescription>Need Teachers</CardDescription>
    <CardTitle className="text-red-600">{stats.needTeachers}</CardTitle>
  </CardHeader>
</Card>

<Card>
  <CardHeader>
    <CardDescription>Total Teaching Load</CardDescription>
    <CardTitle>{stats.totalTeachingHours}h/week</CardTitle>
  </CardHeader>
</Card>
```

## Phase 8: Update Data Fetching

### 8.1 Calculate Coverage in Frontend

**File**: `src/app/dashboard/admin/subjects/page.tsx`

After fetching subjects with enhanced data:

```typescript
const subjectsWithCoverage = subjectsWithAvailability.map(subject => ({
  ...subject,
  coverage: subject.classCount > 0 
    ? Math.round(((subject.assignedClasses || 0) / subject.classCount) * 100)
    : 0
}));

setSubjects(subjectsWithCoverage);
```

## Column Order (Recommended)

Reorder columns for admin workflow:

1. **Subject Name** - Primary identifier
2. **Total Teaching Load** - Most important metric (replaces default hours)
3. **Teachers** - Qualified + Available counts
4. **Coverage** - Visual progress bar + percentage
5. **Status** - Alert badges for quick scanning
6. **Actions** - Details, Edit, Usage buttons

## Implementation Summary

**Files to Modify:**

1. `src/app/api/subjects/route.ts` - Add totalActualHours calculation
2. `src/app/dashboard/admin/subjects/page.tsx` - Update interface, columns, stats
3. `src/components/forms/subject-form.tsx` - Update form label/description

**Key Changes:**

- Replace "default weekly hours" with "total teaching load"
- Add coverage progress bars and percentages
- Add status badges for quick problem identification
- Update statistics to show actionable metrics
- Clarify form labels to avoid confusion

**Admin Benefits:**

- See actual teaching load, not template values
- Identify understaffed subjects at a glance
- Know which subjects need more teachers
- Understand resource allocation across school
- Make data-driven staffing decisions

## Expected Result

**Before (confusing)**:

```
Subject: Mathematics
Weekly Hours: 5h (default template - unclear)
Teachers: 5 qualified
```

**After (clear and actionable)**:

```
Subject: Mathematics
Total Teaching Load: 45h/week (across 12 classes)
Teachers: 5 qualified, 3 available
Coverage: ████░░ 83% (10/12 classes staffed)
Status: [⚠ Need teachers]
```

Admins can now immediately see:

- This subject requires 45 hours of teaching per week
- It's taught in 12 classes
- Only 10 of 12 classes have teachers (83% coverage)
- 3 teachers have capacity to take more classes
- ACTION NEEDED: Staff 2 more classes

### To-dos

- [ ] Enhance teacher cards with capacity metrics, visual bars, and color-coded status
- [ ] Add filtering and sorting by capacity/utilization/availability status
- [ ] Add quick action buttons for assign/set availability on teacher cards
- [ ] Show qualified and available teacher counts on subject cards
- [ ] Add capacity-aware quick assign functionality on subjects page
- [ ] Add assignment coverage indicators showing class assignment status
- [ ] Create reusable TeacherCapacityBar component
- [ ] Create reusable TeacherStatusBadge component
- [ ] Create reusable QuickAssignTeacherDialog component
- [ ] Create bulk teacher stats API endpoint for efficient listing page data
- [ ] Create subject available teachers API endpoint with capacity info