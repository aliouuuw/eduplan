# Time Slot Templates Feature Specification

**Date:** January 10, 2025  
**Priority:** HIGH  
**Status:** 📋 PLANNED for Phase 5.1  

## 🎯 Problem Statement

**Current Limitation:**
All classes in the school share the same set of time slots. This creates inflexibility:
- Primary classes (younger students) need shorter school days
- Secondary classes require full-day schedules
- Different class levels have different lunch durations
- Special schedules needed for exams, events, or half-days

**Example Scenario:**
- **Primary (CP-CM2):** 8:00-12:30 with 30-min lunch
- **Secondary (6ème-Terminale):** 8:00-16:50 with 1.5-hour lunch
- **Currently:** Both must use the same schedule ❌

## ✨ Proposed Solution: Time Slot Templates

### Concept
Create **reusable schedule templates** that can be assigned to different classes or groups of classes.

### Key Benefits
1. ✅ **Flexibility:** Different schedules for different grade levels
2. ✅ **Reusability:** Define once, apply to many classes
3. ✅ **Maintainability:** Update template → all classes using it are updated
4. ✅ **Scalability:** Add exam schedules, holiday schedules, etc.
5. ✅ **Organization:** Clear separation of different schedule types

## 🏗️ Technical Architecture

### Database Schema Changes

#### 1. New Table: `timeSlotTemplates`
```sql
CREATE TABLE time_slot_templates (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,              -- "Primary Schedule", "Secondary Full Day"
  description TEXT,                -- "For classes CP through CM2"
  is_default BOOLEAN DEFAULT FALSE, -- Auto-apply to new classes
  is_active BOOLEAN DEFAULT TRUE,   -- Can be archived
  created_by TEXT NOT NULL,         -- User who created it
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### 2. Modified Table: `timeSlots`
Add `templateId` column:
```sql
ALTER TABLE time_slots ADD COLUMN template_id TEXT;
ALTER TABLE time_slots ADD FOREIGN KEY (template_id) REFERENCES time_slot_templates(id);
```

#### 3. Modified Table: `classes`
Add `templateId` column:
```sql
ALTER TABLE classes ADD COLUMN time_slot_template_id TEXT;
ALTER TABLE classes ADD FOREIGN KEY (time_slot_template_id) REFERENCES time_slot_templates(id);
```

### Relationships
```
timeSlotTemplates (1) ──< (many) timeSlots
timeSlotTemplates (1) ──< (many) classes
schools (1) ──< (many) timeSlotTemplates
```

## 📋 Feature Requirements

### Core Features

#### 1. Template Management UI
**Location:** `/dashboard/admin/time-slot-templates`

**Features:**
- ✅ List all templates with stats (# classes using, # slots)
- ✅ Create new template
- ✅ Edit template details (name, description)
- ✅ Clone existing template
- ✅ Archive/delete template (with validation)
- ✅ Set as default template
- ✅ Preview template schedule (weekly grid)

**UI Components:**
```tsx
- TemplateList (data table)
- TemplateForm (dialog)
- TemplatePreview (read-only grid)
- TemplateStatsCard (usage metrics)
```

#### 2. Time Slot Creation with Templates
**Location:** `/dashboard/admin/time-slots` (enhanced)

**Changes:**
- Add template selector dropdown (top of page)
- Filter time slots by selected template
- Create new template from current view
- Switch between templates
- Bulk operations:
  - Move slots between templates
  - Copy slots to another template

#### 3. Class Template Assignment
**Location:** `/dashboard/admin/classes` (enhanced)

**Changes:**
- Add "Schedule Template" field to class form
- Dropdown to select from active templates
- Show template preview on selection
- Bulk assign: Select multiple classes → assign template

#### 4. Timetable Builder Integration
**Location:** `/dashboard/admin/timetables`

**Changes:**
- Load time slots based on class's assigned template
- Show template name in header (e.g., "Building timetable for CM2 A (Primary Schedule)")
- Warning if class has no template assigned
- Quick action: "Assign Template" button

### Advanced Features

#### 5. Template Analytics
- Most used template
- Classes per template
- Total teaching hours per template
- Comparison view (Template A vs Template B)

#### 6. Template Cloning Workflow
```
1. Select template to clone
2. Enter new name
3. Preview slots (editable)
4. Save as new template
```

#### 7. Bulk Template Operations
- Assign template to all Primary classes
- Assign template to all Secondary classes
- Assign template to specific academic level

#### 8. Template Validation
- Minimum teaching hours per day
- Maximum consecutive periods
- Required break periods
- Warning if template has gaps

## 🎨 UI/UX Design

### Template Management Page

```
┌─────────────────────────────────────────────────────────┐
│ Time Slot Templates                    [+ New Template] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ Primary     │ │ Secondary   │ │ Exam        │        │
│ │ Schedule    │ │ Full Day    │ │ Schedule    │        │
│ │             │ │             │ │             │        │
│ │ 8:00-12:30  │ │ 8:00-16:50  │ │ 8:00-15:00  │        │
│ │ 12 slots    │ │ 24 slots    │ │ 16 slots    │        │
│ │ 10 classes  │ │ 14 classes  │ │ 0 classes   │        │
│ │             │ │             │ │             │        │
│ │ [Preview]   │ │ [Preview]   │ │ [Preview]   │        │
│ │ [Edit]      │ │ [Edit]      │ │ [Edit]      │        │
│ │ [Clone]     │ │ [Clone]     │ │ [Clone]     │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Template Selector (in Time Slots page)

```
┌─────────────────────────────────────────────────────────┐
│ Time Slots                                                │
├─────────────────────────────────────────────────────────┤
│ Template: [Primary Schedule ▼]    [+ New Template]      │
│                                                           │
│ Showing 12 slots for Primary Schedule                    │
│ Used by 10 classes (CP A, CP B, CE1 A, ...)             │
└─────────────────────────────────────────────────────────┘
```

### Class Form Enhancement

```
┌─────────────────────────────────────────────────────────┐
│ Create Class                                              │
├─────────────────────────────────────────────────────────┤
│ Name: [_____________]                                     │
│ Level: [Primary ▼]                                        │
│ Academic Year: [2025-2026 ▼]                             │
│ Capacity: [30______]                                      │
│                                                           │
│ Schedule Template: [Primary Schedule ▼]  [Preview]       │
│ ℹ️ 12 time slots, 8:00-12:30 daily                       │
│                                                           │
│                                     [Cancel]  [Create]    │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Migration Strategy

### For Existing Data
1. Create a default template: "Default Schedule"
2. Migrate all existing time slots to this template
3. Assign this template to all existing classes
4. Schools can then create new templates as needed

### Migration SQL
```sql
-- 1. Create default template
INSERT INTO time_slot_templates (id, school_id, name, description, is_default, is_active, created_at, updated_at)
SELECT 
  'default-' || school_id, 
  school_id, 
  'Default Schedule', 
  'Automatically created from existing time slots', 
  true, 
  true, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
FROM schools;

-- 2. Assign existing time slots to default template
UPDATE time_slots
SET template_id = 'default-' || school_id;

-- 3. Assign default template to existing classes
UPDATE classes
SET time_slot_template_id = 'default-' || school_id;
```

## 📊 Use Cases

### Use Case 1: Primary vs Secondary Schedules
**Scenario:** School wants different schedules for younger and older students

**Solution:**
1. Create "Primary Schedule" template (8:00-12:30)
2. Create "Secondary Schedule" template (8:00-16:50)
3. Assign Primary template to CP, CE1, CE2, CM1, CM2 classes
4. Assign Secondary template to 6ème through Terminale classes

**Result:** Each class now sees only relevant time slots in timetable builder

### Use Case 2: Exam Period Schedule
**Scenario:** During exams, school uses modified schedule

**Solution:**
1. Create "Exam Schedule" template
2. Configure shorter periods for exam sessions
3. Temporarily assign to all classes
4. After exams, revert to normal templates

**Result:** Easy schedule switching without recreating time slots

### Use Case 3: Special Event Day
**Scenario:** Sports day with half-day schedule

**Solution:**
1. Create "Half-Day Schedule" template
2. Configure 8:00-12:00 slots
3. Assign to participating classes
4. Timetables automatically show only morning slots

**Result:** Flexible scheduling for special events

## 🔐 Security & Validation

### Permissions
- **Admin:** Full access (create, edit, delete templates)
- **Teacher:** View only (see which template their classes use)
- **Student/Parent:** No access

### Validation Rules
1. Template name must be unique per school
2. Cannot delete template if classes are using it
3. At least one template must be marked as default
4. Template must have at least 1 time slot
5. Template can't be deleted if it has active timetable entries

### Cascade Behavior
```
Delete Template:
  - If classes using it: Block deletion (show error)
  - If no classes: Allow deletion
  - If time slots exist: Offer to delete or reassign

Archive Template:
  - Set is_active = false
  - Hide from dropdowns
  - Keep data intact
```

## 🚀 Implementation Plan

### Phase 5.1.1 - Database & API (Week 1)
- [ ] Add database migrations
- [ ] Create template API routes (`/api/time-slot-templates`)
- [ ] Add templateId to time slots API
- [ ] Add templateId to classes API
- [ ] Write migration script for existing data

### Phase 5.1.2 - Template Management UI (Week 1-2)
- [ ] Create template management page
- [ ] Build template form component
- [ ] Add template preview component
- [ ] Implement template cloning

### Phase 5.1.3 - Integration (Week 2)
- [ ] Add template selector to time slots page
- [ ] Add template field to class form
- [ ] Update timetable builder to filter by template
- [ ] Add bulk assignment feature

### Phase 5.1.4 - Polish & Testing (Week 2)
- [ ] Add template analytics
- [ ] Implement validation rules
- [ ] Write tests
- [ ] Update documentation

## 📈 Success Metrics

**Adoption:**
- 80% of schools create at least 2 templates within first month
- 90% of classes have assigned template

**Efficiency:**
- 50% reduction in time slot management time
- 30% fewer scheduling conflicts (due to clearer templates)

**Satisfaction:**
- Admin feedback: "Much easier to manage different schedules"
- Teacher feedback: "Clearer structure, less confusion"

## 🔗 Related Features

**Dependencies:**
- Phase 5.0: Time Slots Management ✅
- Phase 5.0: Timetable Builder ✅

**Enables:**
- Phase 5.2: Automatic timetable generation (per template)
- Phase 5.3: Template-based optimization
- Phase 6: Student dashboard (show template-specific schedule)

---

**Status:** Ready for implementation in Phase 5.1  
**Priority:** HIGH - Critical for multi-level schools  
**Estimated Effort:** 2 weeks  
**Risk Level:** LOW - Well-defined requirements
