<!-- 474fdd2b-c302-4c8c-a2e8-1d17ac4ba0e7 6ea5410f-832a-4786-948a-da1eae46e39f -->
# Admin Scheduling Enhancement Plan

## Overview

Improve the timetable system with time slot templates, balanced auto-scheduling, integrated class-level timetable management, and PDF export capabilities. Focus: admin-facing features only.

## Priority 1: Time Slot Templates (Week 1)

### Problem

All classes currently share the same time slots. Primary classes (8:00-12:30) and Secondary classes (8:00-16:50) need different schedules.

### Solution

Implement time slot templates as documented in `TIME_SLOT_TEMPLATES_FEATURE.md`.

**Database Changes:**

- Add `time_slot_templates` table (id, schoolId, name, description, isDefault)
- Add `templateId` column to `time_slots` table
- Add `timeSlotTemplateId` column to `classes` table
- Migration script to create default template for existing data

**API Endpoints:**

- `GET/POST /api/time-slot-templates` - List and create templates
- `GET/PUT/DELETE /api/time-slot-templates/[id]` - Manage individual templates
- Update `GET /api/time-slots` to support `?templateId=xxx` filter
- Update `POST /api/time-slots` to require templateId

**UI Implementation:**

- Template management page: `/dashboard/admin/scheduling/templates`
- Add template selector to time slots page
- Add template field to class form (dropdown with preview)
- Update timetable builder to load slots based on class's template

**Validation:**

- Cannot delete template if classes use it
- Must have at least one template
- Prevent orphaned time slots

---

## Priority 2: Balanced Subject Distribution (Week 1-2)

### Problem

Auto-scheduler may cluster subjects (e.g., all Math classes on Monday). Need to spread subjects evenly across the week.

### Solution

Enhance auto-scheduler algorithm in `src/lib/auto-scheduler.ts`.

**Algorithm Improvements:**

1. **Day Distribution Scoring**: Track how many sessions of each subject are scheduled per day
2. **Spread Strategy**: When placing a subject, prefer days with fewer sessions of that subject
3. **Consecutive Period Detection**: Avoid scheduling same subject back-to-back unless necessary
4. **Balance Validation**: After generation, report if subjects are unevenly distributed

**Implementation:**

```typescript
// Add to subject placement logic
function selectBestTimeSlot(
  subject: Subject,
  availableSlots: TimeSlot[],
  currentSchedule: Map<string, Set<string>>
): TimeSlot {
  // Score each slot based on:
  // 1. Day balance (prefer days with fewer sessions of this subject)
  // 2. Time distribution (morning vs afternoon)
  // 3. Teacher availability
  // Return slot with best score
}
```

**UI Enhancements:**

- Add "Subject Distribution" section to auto-gen results
- Show per-day breakdown: "Math: Mon(2), Tue(1), Wed(2), Thu(0), Fri(1)"
- Warning badge if subject is clustered (>50% on single day)
- "Regenerate with better distribution" button if imbalanced

---

## Priority 3: Class-Level Timetable Management (Week 2)

### Problem

Timetable builder is separate at `/dashboard/admin/scheduling/timetables`. Should be integrated into class detail pages for better UX.

### Solution

Add Timetable tab to `/dashboard/admin/classes/[classId]` page.

**Current Class Detail Structure:**

```
/dashboard/admin/classes/[classId]
 - Overview tab (class info)
 - Subjects tab (currently "coming soon")
 - Teachers tab (currently "coming soon")
```

**New Structure:**

```
/dashboard/admin/classes/[classId]
 - Overview tab
 - Subjects tab (implement - show assigned subjects with weekly hours)
 - Teachers tab (implement - show assigned teachers with subjects)
 - Timetable tab (NEW - full timetable management)
```

**Timetable Tab Features:**

- View current timetable (grid layout by day/time)
- Auto-generate button (with strategy options)
- Manual edit: click slot → select teacher/subject
- Statistics: completion %, subject quotas fulfilled
- Export button → PDF download
- Save/publish workflow

**Files to Modify:**

- `src/app/dashboard/admin/classes/[classId]/page.tsx` - Add Timetable tab
- Reuse components from `src/app/dashboard/admin/scheduling/timetables/page.tsx`
- Extract timetable grid into reusable component

**Benefits:**

- Contextual: manage timetable where you manage the class
- Cleaner navigation: no separate scheduling section needed
- Better workflow: configure class → assign teachers → build timetable → export

---

## Priority 4: PDF Export per Class (Week 2)

### Problem

Cannot print or share class schedules. Need PDF generation.

### Solution

Implement PDF export using a library (e.g., jsPDF, react-pdf, or Puppeteer).

**Library Choice:**

- **Option A: jsPDF** - Client-side, lightweight, good for simple tables
- **Option B: @react-pdf/renderer** - React components → PDF, better styling
- **Option C: Puppeteer** - Server-side HTML → PDF, most flexible (recommended)

**Implementation (Puppeteer approach):**

1. Create PDF generation API:
```typescript
// src/app/api/timetables/[classId]/export/route.ts
export async function GET(req, { params }) {
  // 1. Fetch class timetable
  // 2. Render HTML template (server-side)
  // 3. Convert to PDF using Puppeteer
  // 4. Return PDF as download
}
```

2. Create HTML template:
```tsx
// src/lib/pdf-templates/timetable.tsx
export function TimetableTemplate({ class, timetable, timeSlots }) {
  return (
    <html>
      <head>
        <style>{/* Print-friendly CSS */}</style>
      </head>
      <body>
        <h1>{class.name} - Timetable {academicYear}</h1>
        <table>
          {/* Grid with days and time slots */}
        </table>
      </body>
    </html>
  );
}
```

3. Add export button to class timetable tab:
```tsx
<Button onClick={async () => {
  const response = await fetch(`/api/timetables/${classId}/export`);
  const blob = await response.blob();
  downloadBlob(blob, `${className}-timetable.pdf`);
}}>
  <Download className="h-4 w-4 mr-2" />
  Export PDF
</Button>
```


**PDF Features:**

- School logo and name
- Class name and academic year
- Weekly grid with all subjects and teachers
- Legend with teacher names
- Generation timestamp
- Print-optimized layout

---

## Priority 5: Admin Teacher Availability Management (Week 3)

### Current State Check

Based on docs, admin teacher availability page exists at `/dashboard/admin/teachers/availability`.

**Verification Needed:**

- Can admins view all teachers' availability?
- Can admins edit availability on behalf of teachers (bulk operations)?
- Is there a coverage report (which teachers have/haven't set availability)?

**Enhancements (if needed):**

1. **Bulk Availability Setting**

                        - Select multiple teachers
                        - Apply common schedule (e.g., Mon-Fri 8:00-17:00) to all
                        - Already documented in `AUTO_SCHEDULER_MVP_FEATURE.md` as complete - verify it works

2. **Coverage Dashboard**

                        - Show which teachers have set availability
                        - Warning for teachers without availability
                        - Quick "remind" action to notify teachers

3. **Availability Override**

                        - Admin can edit teacher availability directly
                        - Useful for substitute teachers or schedule changes
                        - Mark as "admin-set" vs "teacher-set"

4. **Conflict Detection**

                        - Show if teacher availability conflicts with assigned classes
                        - "Teacher X available Mon-Wed but has classes on Thursday"

**Files to Check:**

- `src/app/dashboard/admin/teachers/availability/page.tsx` (check if exists)
- `src/app/api/teacher-availability/bulk/route.ts` (documented as implemented)

---

## Implementation Order

### Week 1: Foundation

1. Time Slot Templates (database + API)
2. Template management UI
3. Update class form with template selector
4. Balanced subject distribution algorithm

### Week 2: Integration

5. Implement Subjects tab in class detail page
6. Implement Teachers tab in class detail page
7. Add Timetable tab to class detail page
8. PDF export functionality

### Week 3: Polish

9. Verify/enhance admin teacher availability management
10. Subject distribution UI improvements
11. Testing and bug fixes
12. Documentation updates

---

## Success Criteria

**Time Slot Templates:**

- ✅ Admin can create multiple templates (Primary, Secondary, Exam)
- ✅ Each class can be assigned a different template
- ✅ Timetable builder only shows slots from class's template

**Balanced Distribution:**

- ✅ Auto-scheduler spreads subjects across the week
- ✅ Warning shown if subject is clustered on one day
- ✅ Admin can regenerate if distribution is poor

**Class-Level Management:**

- ✅ Full timetable management available in class detail page
- ✅ Subjects tab shows all assigned subjects with weekly hours
- ✅ Teachers tab shows all assigned teachers
- ✅ Smooth workflow from class setup to timetable completion

**PDF Export:**

- ✅ One-click PDF download from class timetable tab
- ✅ Professional layout with school branding
- ✅ Print-ready format

**Teacher Availability:**

- ✅ Admins can view and manage all teachers' availability
- ✅ Bulk operations available for common schedules
- ✅ Coverage dashboard shows which teachers need attention

---

## Files to Create/Modify

**New Files:**

- `src/app/api/time-slot-templates/route.ts`
- `src/app/api/time-slot-templates/[id]/route.ts`
- `src/app/dashboard/admin/scheduling/templates/page.tsx`
- `src/components/forms/time-slot-template-form.tsx`
- `src/app/api/timetables/[classId]/export/route.ts`
- `src/lib/pdf-templates/timetable.ts`
- `src/components/timetable/timetable-grid.tsx` (extracted reusable)

**Modified Files:**

- `src/db/schema.ts` - Add template tables
- `src/lib/auto-scheduler.ts` - Balanced distribution
- `src/app/dashboard/admin/classes/[classId]/page.tsx` - Add tabs
- `src/app/api/time-slots/route.ts` - Support templateId filter
- `src/components/forms/class-form.tsx` - Add template selector

---

## Dependencies

**NPM Packages:**

- `puppeteer` - PDF generation (or alternative)
- No other new dependencies needed

**Database:**

- Migration for time slot templates
- Migration for template associations

---

## Risks & Mitigation

**Risk 1: Template Migration Complexity**

- Mitigation: Create default template, assign all existing data to it first

**Risk 2: PDF Generation Performance**

- Mitigation: Generate PDFs async, show loading state, cache if needed

**Risk 3: Breaking Existing Timetables**

- Mitigation: Keep existing timetable builder, add new class-level UI alongside
- Allow gradual migration

**Risk 4: Subject Distribution Algorithm**

- Mitigation: Make it configurable (enable/disable), provide override options

---

## Testing Plan

1. **Time Slot Templates**

                        - Create primary and secondary templates
                        - Assign different classes to different templates
                        - Verify timetable builder shows correct slots

2. **Balanced Distribution**

                        - Generate timetables for multiple classes
                        - Verify subjects are spread across days
                        - Test with edge cases (limited availability)

3. **Class-Level UI**

                        - Navigate through all tabs
                        - Edit timetable from class page
                        - Verify auto-generate works

4. **PDF Export**

                        - Export various class sizes
                        - Verify layout on different printers
                        - Test with empty/partial timetables

5. **Teacher Availability**

                        - Bulk set availability for 10+ teachers
                        - Verify coverage dashboard accuracy
                        - Test conflict detection

---

## Documentation Updates

- Update `tasks.md` with Phase 6.0 completion
- Create `PHASE_6_0_ADMIN_SCHEDULING_ENHANCEMENT.md`
- Update README with new template features
- Add PDF export guide

### To-dos

- [ ] Add time slot templates database schema and migrations
- [ ] Create API endpoints for template management
- [ ] Build template management UI and class template selector
- [ ] Enhance auto-scheduler with balanced subject distribution algorithm
- [ ] Implement Subjects tab in class detail page
- [ ] Implement Teachers tab in class detail page
- [ ] Add Timetable tab to class detail page with full management features
- [ ] Implement PDF export functionality per class
- [ ] Verify and enhance admin teacher availability management
- [ ] Testing, bug fixes, and documentation updates