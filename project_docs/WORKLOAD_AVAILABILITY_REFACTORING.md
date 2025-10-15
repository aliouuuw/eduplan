# Workload & Availability Integration Refactoring

**Completed: October 15, 2025**

---

## 📋 Overview

This refactoring integrates teacher **availability** (time slots when teachers can teach) with **workload** (hours currently assigned) to create a comprehensive teacher capacity management system. Previously, availability was tracked but not used for validation or assignment decisions.

---

## 🎯 Key Changes

### 1. **Unified Teacher Metrics System**

**New File**: `src/lib/teacher-utils.ts`

Created a comprehensive metrics system that combines:
- **Workload**: Current teaching hours assigned across all classes
- **Availability**: Time slots when teacher is available to teach
- **Capacity**: Available hours remaining (availability - workload)
- **Utilization**: Percentage of availability being used

```typescript
interface TeacherMetrics {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  
  workload: {
    totalWeeklyHours: number;
    assignmentCount: number;
    classCount: number;
    assignments: TeacherAssignment[];
  };
  
  availability: {
    totalWeeklyMinutes: number;
    totalWeeklyHours: number;
    slotCount: number;
    slots: TeacherAvailabilitySlot[];
    hasAvailability: boolean;
  };
  
  capacity: {
    availableHours: number; // availability - workload
    utilizationPercentage: number;
    isOverallocated: boolean;
    canAcceptMoreHours: number;
  };
  
  qualifications: {
    count: number;
    subjects: TeacherQualification[];
  };
}
```

### 2. **Enhanced Assignment Validation**

**Updated File**: `src/lib/assignment-validation.ts`

The `validateTeacherAssignment` function now:

1. **Checks Availability First** (if set)
   - Error if assignment exceeds available capacity
   - Warning if near capacity (< 2h remaining)
   - Info about utilization percentage

2. **Falls Back to Hard Limits** (if no availability set)
   - Warning that teacher has no availability schedule
   - Uses legacy 30h max, 25h warning thresholds

**Before:**
```typescript
// Only checked workload against hard limits
if (newTotalHours > MAX_WEEKLY_HOURS) {
  warnings.push({ type: 'error', message: 'Exceeds 30h limit' });
}
```

**After:**
```typescript
// Checks actual availability first
const metrics = await getTeacherMetrics(teacherId, schoolId);
if (metrics.availability.hasAvailability) {
  const newAvailableHours = metrics.capacity.availableHours - weeklyHours;
  if (newAvailableHours < 0) {
    warnings.push({
      type: 'error',
      message: 'Assignment exceeds teacher availability',
      details: `Teacher has ${metrics.availability.totalWeeklyHours}h available...`
    });
  }
}
```

### 3. **New API Endpoint**

**New File**: `src/app/api/teachers/[teacherId]/stats/route.ts`

```
GET /api/teachers/[teacherId]/stats
```

Returns comprehensive teacher metrics including:
- Workload statistics
- Availability statistics  
- Capacity calculations
- Qualifications

Replaces multiple API calls with a single comprehensive endpoint.

### 4. **UI Enhancements**

**Updated File**: `src/app/dashboard/admin/classes/[classId]/page.tsx`

#### Teacher Selection Now Shows:

**With Availability Set:**
```
Teacher Name [Q] [5h free] [80%]
```
- `[Q]` = Qualified badge
- `[5h free]` = Available capacity (color-coded)
  - Green: < 75% utilization
  - Yellow: 75-89% utilization
  - Red: ≥ 90% utilization
- `[80%]` = Utilization percentage

**Without Availability:**
```
Teacher Name [Q] [15h]
```
- Falls back to showing total workload

#### Teacher Sorting:
1. Qualified teachers first
2. Then by **available capacity** (descending) - teachers with more free time first

### 5. **Color-Coded Capacity Indicators**

```typescript
className={`text-xs ${
  (teacher.utilizationPercentage || 0) >= 90 ? 'bg-red-50 text-red-700 border-red-300' :
  (teacher.utilizationPercentage || 0) >= 75 ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
  'bg-green-50 text-green-700 border-green-300'
}`}
```

---

## 🔄 Migration Path

### For Schools Without Availability Data:
- System gracefully falls back to legacy behavior
- Shows warning: "No availability schedule set"
- Uses hard 30h limit with 25h warning threshold
- Encourages adding availability for better management

### For Schools With Availability Data:
- Immediately benefits from capacity-based validation
- See real-time utilization percentages
- Get better teacher recommendations (sorted by capacity)
- Prevent over-allocation beyond available time slots

---

## 📊 Benefits

### 1. **Smarter Assignment Decisions**
- Teachers sorted by actual available capacity
- Visual indicators of utilization levels
- Prevents scheduling beyond available time slots

### 2. **Better Capacity Management**
- See at a glance who has capacity for more assignments
- Identify overallocated teachers
- Balance workload across teaching staff

### 3. **Improved Data Accuracy**
- Availability reflects actual teaching hours possible
- Workload shows current commitments
- Capacity automatically calculated

### 4. **Progressive Enhancement**
- Works with or without availability data
- Graceful degradation to legacy limits
- Encourages adoption of availability tracking

---

## 🔧 Technical Details

### Availability Calculation

```typescript
function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
}

// Sum all availability slots
const totalAvailabilityMinutes = slots.reduce(
  (sum, slot) => sum + calculateDurationMinutes(slot.startTime, slot.endTime), 
  0
);
const totalAvailabilityHours = Math.round((totalAvailabilityMinutes / 60) * 100) / 100;
```

### Capacity Calculation

```typescript
const availableHours = totalAvailabilityHours - totalWeeklyHours;
const utilizationPercentage = totalAvailabilityHours > 0 
  ? Math.round((totalWeeklyHours / totalAvailabilityHours) * 100)
  : 0;
const isOverallocated = totalWeeklyHours > totalAvailabilityHours;
```

### Performance Optimization

- Single API call (`/stats`) replaces multiple calls (`/workload`, `/availability`, `/qualifications`)
- Teacher metrics cached in UI state
- Efficient database queries with JOINs

---

## 🎨 UI/UX Improvements

### Before:
```
John Doe [Q] [15h]
Jane Smith [NQ] [20h]
Bob Wilson [Q] [10h]
```
- Only shows workload
- No indication of capacity
- Hard to know who can take more hours

### After (with availability):
```
Bob Wilson [Q] [8h free] [55%]  ← Most capacity
John Doe [Q] [3h free] [83%]    ← Some capacity  
Jane Smith [NQ] [0h free] [100%] ← At capacity
```
- Clear capacity indicators
- Color-coded urgency
- Sorted by available capacity

---

## 📝 API Usage Examples

### Get Comprehensive Stats
```typescript
const response = await fetch(`/api/teachers/${teacherId}/stats`);
const metrics = await response.json();

console.log(metrics.workload.totalWeeklyHours); // 15
console.log(metrics.availability.totalWeeklyHours); // 20
console.log(metrics.capacity.availableHours); // 5
console.log(metrics.capacity.utilizationPercentage); // 75
```

### Validate Assignment
```typescript
const warnings = await validateTeacherAssignment(
  teacherId,
  subjectId,
  classId,
  3, // weeklyHours
  schoolId
);

// With availability:
// [{ type: 'warning', message: 'Near capacity', details: '2h remaining' }]

// Without availability:
// [{ type: 'warning', message: 'No availability schedule set' }]
```

---

## 🚀 Future Enhancements

### Phase 2 - Timetable Integration
- Check actual time slot conflicts (not just total hours)
- Suggest alternative time slots
- Auto-detect scheduling conflicts

### Phase 3 - Analytics Dashboard
- Utilization trends over time
- Department-wide capacity analysis
- Identify underutilized teachers

### Phase 4 - Automated Balancing
- Suggest workload rebalancing
- Optimize teacher assignments
- Fair distribution algorithms

---

## 🧪 Testing Recommendations

1. **With Availability Data**
   - Assign teacher up to capacity → Success
   - Try to exceed capacity → Error
   - Check color coding at 74%, 75%, 89%, 90%

2. **Without Availability Data**
   - Should show warning
   - Fall back to 30h limit
   - Encourage setting availability

3. **Edge Cases**
   - Teacher with 0 availability slots
   - Teacher with overlapping slots
   - Teacher with all time allocated

---

## 📚 Files Modified

- ✅ `src/lib/teacher-utils.ts` (NEW)
- ✅ `src/lib/assignment-validation.ts` (UPDATED)
- ✅ `src/app/api/teachers/[teacherId]/stats/route.ts` (NEW)
- ✅ `src/app/dashboard/admin/classes/[classId]/page.tsx` (UPDATED)

---

## ✅ Verification Checklist

- [x] Type checking passes (`tsc --noEmit`)
- [x] Backwards compatible with existing data
- [x] Graceful degradation without availability
- [x] Color-coded capacity indicators
- [x] Enhanced validation with availability checks
- [x] Comprehensive API documentation
- [x] Legacy function maintained for compatibility

---

## 💡 Key Insight

**Availability is now the source of truth for capacity, not arbitrary hour limits.**

This shift enables:
- Data-driven scheduling decisions
- More accurate workload management
- Better teacher experience
- Foundation for intelligent timetabling

The system now asks: *"Does this teacher have time slots available?"* instead of *"Is this teacher under 30 hours?"*

