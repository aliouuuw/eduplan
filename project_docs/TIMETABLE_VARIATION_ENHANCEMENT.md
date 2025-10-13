# Timetable Generation Variation Enhancement

## Summary

Enhanced the auto-scheduler to generate more realistic and varied timetables with configurable strategies, double periods, improved distribution, and randomization.

## Implemented Features

### 1. **Strategy-Based Scheduling** ✅

Three scheduling strategies are now supported:

- **`balanced`** (default): Equal weight to all time slots, focuses on even distribution
- **`morning-heavy`**: Prefers slots before 11:00 AM (1.8x weight multiplier)
- **`afternoon-heavy`**: Prefers slots after 1:00 PM (1.8x weight multiplier)

**Implementation**:
- `getStrategyWeight(slot, strategy)` applies multipliers based on time and strategy
- Strategy passed from API route to scheduler via `SchedulerConstraints.strategy`
- Both single slots and double periods respect strategy preferences

**Usage**:
```json
POST /api/timetables/auto-generate
{
  "classId": "class-123",
  "strategy": "morning-heavy",
  "preserveExisting": false
}
```

### 2. **Double Period Support** ✅

Subjects with 4+ weekly hours can receive double periods (consecutive 2-hour blocks).

**Configuration**:
```typescript
doublePeriod: {
  minWeeklyHours: 4,    // Minimum hours needed
  probability: 0.6      // 60% chance when eligible
}
```

**How it works**:
1. For each subject with 4+ hours:
   - 60% chance to attempt double period
   - Find all consecutive slot pairs on same day
   - Score pairs by strategy (morning-heavy prefers early doubles)
   - Select best-scoring pair with available teachers
   - Place 2 hours in consecutive slots
2. Remaining hours placed as singles

**Benefits**:
- More realistic for lab sciences, arts, physical education
- Reduces context switching
- Honors strategy (morning-heavy → double periods in morning)

### 3. **Improved Distribution Logic** ✅

Subjects now automatically spread across multiple days based on weekly hours.

**Distribution Rules**:
```typescript
rules: [
  { weeklyHoursThreshold: 5, targetDays: 3 }, // 5+ hours → spread across 3+ days
  { weeklyHoursThreshold: 3, targetDays: 2 }, // 3+ hours → spread across 2+ days
  { weeklyHoursThreshold: 1, targetDays: 1 }, // 1+ hours → at least 1 day
]
```

**Scoring System**:
- **New Day Bonus**: 1.5x multiplier for days without this subject (if under target)
- **Distribution Weight**: `1 / (dayCount + 1)` - prefers days with fewer hours
- **Strategy Weight**: Applied based on time of day
- **Random Jitter**: Small randomization (0-0.1) for tie-breaking

**Example**:
- Math (5 hours/week) → automatically spreads across 3+ days
- PE (2 hours/week) → may be on same day or split
- French (3 hours/week) → spreads across 2+ days

### 4. **Randomization & Variation** ✅

Same inputs now produce varied outputs while respecting constraints.

**Implementation**:
- Deterministic pseudo-random generator with seed (`createRandomGenerator`)
- Random jitter added to slot scores (0-10% of score)
- Random teacher selection when multiple available
- Shuffling capability with `shuffleArray` utility

**Benefits**:
- Running generation multiple times gives different valid schedules
- Can generate and compare multiple options
- Reproducible with same seed (for testing)

### 5. **Daily Coverage Tracking** ✅

System now tracks which days have classes.

**Function**: `ensureDailyCoverage(timetable, slotLookup, availableDays)`

Returns a Set of days (1-7) that have at least one class scheduled.

**Statistics**:
- `daysWithClasses`: Count of days with scheduled classes
- Helps identify if any school days are empty

### 6. **Enhanced Statistics** ✅

New statistics added to scheduler result:

```typescript
statistics: {
  totalSlotsNeeded: number;
  slotsPlaced: number;
  slotsConflicted: number;
  subjectsPlaced: number;
  totalSubjects: number;
  doublePeriodCount: number;      // NEW: Number of double periods created
  daysWithClasses: number;         // NEW: Days that have classes
  distributionQuality: number;     // NEW: 0-1 score for distribution quality
}
```

**Distribution Quality Calculation**:
- 0.5 points if subject meets target day distribution
- 0.5 points if subject is balanced (no day >50% of hours)
- Average across all subjects = overall quality score

### 7. **Enhanced Distribution Metrics** ✅

Per-subject distribution now includes:

```typescript
distribution: {
  [subjectId]: {
    subjectName: string;
    totalHours: number;
    byDay: { [day: number]: number };
    uniqueDays: number;           // NEW: Count of days scheduled
    meetsTarget: boolean;          // NEW: Meets multi-day target?
    isBalanced: boolean;           // Existing: No single day >50%
  }
}
```

## Configuration

All behavior controlled by `SCHEDULER_CONFIG` constant:

```typescript
const SCHEDULER_CONFIG = {
  doublePeriod: {
    minWeeklyHours: 4,
    probability: 0.6,
  },
  distribution: {
    rules: [
      { weeklyHoursThreshold: 5, targetDays: 3 },
      { weeklyHoursThreshold: 3, targetDays: 2 },
      { weeklyHoursThreshold: 1, targetDays: 1 },
    ],
  },
  randomization: {
    enabled: true,
    tieBreakSeed: Date.now(),
    jitter: 0.1,
  },
};
```

## Algorithm Flow

1. **Initialize**
   - Parse strategy from API request
   - Create seeded random generator
   - Build slot lookup and available days list

2. **For Each Subject** (sorted by weekly hours desc):
   
   a. **Attempt Double Period** (if 4+ hours):
      - Find consecutive slot pairs
      - Score by strategy preference
      - Place best pair if available
   
   b. **Place Remaining Singles**:
      - Find valid slots with available teachers
      - Score slots by:
        * Strategy weight (morning/afternoon preference)
        * New day bonus (if under target distribution)
        * Distribution balance (prefer days with fewer hours)
        * Random jitter (for variation)
      - Sort by score (highest first)
      - Place hours one by one

3. **Calculate Metrics**:
   - Distribution quality per subject
   - Daily coverage
   - Overall statistics

4. **Return Result**:
   - Timetable entries (status: draft)
   - Conflicts (if any)
   - Comprehensive statistics
   - Distribution breakdown

## Example Results

### Before Enhancement
- Same inputs → same output every time
- No double periods
- Subjects could cluster on single day
- No strategy support
- Basic statistics only

### After Enhancement
- Same inputs → varied outputs
- Double periods for eligible subjects (Math, Science, PE)
- Math (5 hrs) spreads across Monday, Wednesday, Friday
- Morning-heavy strategy → most classes before 11 AM
- Rich statistics showing distribution quality, double periods, coverage

## API Changes

**Request** (`POST /api/timetables/auto-generate`):
```json
{
  "classId": "class-abc-2025",
  "preserveExisting": false,
  "strategy": "morning-heavy"  // NEW: balanced | morning-heavy | afternoon-heavy
}
```

**Response** (enhanced):
```json
{
  "success": true,
  "result": {
    "success": true,
    "timetable": [...],
    "conflicts": [],
    "multiTeacherSlots": [],
    "statistics": {
      "totalSlotsNeeded": 25,
      "slotsPlaced": 25,
      "slotsConflicted": 0,
      "subjectsPlaced": 8,
      "totalSubjects": 8,
      "doublePeriodCount": 2,        // NEW
      "daysWithClasses": 5,           // NEW
      "distributionQuality": 0.87     // NEW
    },
    "distribution": {
      "subject-math-123": {
        "subjectName": "Mathematics",
        "totalHours": 5,
        "byDay": { "2": 2, "4": 2, "6": 1 },
        "uniqueDays": 3,               // NEW
        "meetsTarget": true,           // NEW
        "isBalanced": true
      }
    }
  },
  "summary": { ... }
}
```

## Files Modified

1. **`src/lib/auto-scheduler.ts`** (complete refactor):
   - Added `SCHEDULER_CONFIG` with distribution rules
   - Added utility functions: `createRandomGenerator`, `shuffleArray`, `getTargetDistributionDays`, `getStrategyWeight`
   - Added `attemptDoublePeriods()` - creates consecutive 2-hour blocks
   - Added `findConsecutiveSlotPairs()` - identifies adjacent slots
   - Added `ensureDailyCoverage()` - tracks daily distribution
   - Added `calculateDistributionQuality()` - scores schedule quality
   - Enhanced `findValidSlotsForSubject()` - strategy-aware scoring with randomization
   - Enhanced `calculateDistributionMetrics()` - added uniqueDays, meetsTarget
   - Updated interfaces: `SchedulerConstraints`, `SchedulerResult`

2. **`src/app/api/timetables/auto-generate/route.ts`**:
   - Pass `strategy` parameter from request to scheduler
   - Schema already supported strategy, now fully utilized

## Testing Recommendations

1. **Strategy Verification**:
   - Generate with `morning-heavy` → verify most classes before 11 AM
   - Generate with `afternoon-heavy` → verify most classes after 1 PM
   - Generate with `balanced` → verify even time distribution

2. **Double Period Verification**:
   - Subject with 4+ hours should sometimes have double periods
   - Double periods should be consecutive (no breaks)
   - Should respect teacher availability for both slots

3. **Distribution Verification**:
   - Math (5 hours) should span 3+ days
   - Each subject should not cluster on one day (unless 1-2 hours total)
   - `distributionQuality` should be >0.7 for good schedules

4. **Randomization Verification**:
   - Multiple generations should produce different layouts
   - All should respect hard constraints (no teacher conflicts)
   - All should respect strategy preferences

5. **Statistics Verification**:
   - `doublePeriodCount` matches actual consecutive pairs
   - `daysWithClasses` = 5 for typical school week
   - `distributionQuality` correlates with visual quality

## Future Enhancements

- [ ] Add subject-type categories (core, elective, physical)
- [ ] Add pedagogical rules (heavy subjects in morning by default)
- [ ] Allow custom distribution rules per subject
- [ ] Add "avoid consecutive" rules for similar subjects
- [ ] Support multi-period blocks (3+ consecutive hours)
- [ ] Add conflict resolution suggestions
- [ ] Generate multiple candidate schedules for comparison

## Conclusion

The timetable generator now produces **realistic, varied, and strategically-optimized schedules** with:
- ✅ Configurable time-of-day preferences
- ✅ Automatic double periods for suitable subjects
- ✅ Intelligent multi-day distribution
- ✅ Built-in randomization for variety
- ✅ Comprehensive quality metrics

The system respects all hard constraints (teacher availability, no conflicts) while providing soft optimization through strategy and distribution rules.

