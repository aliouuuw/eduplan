# 🐛 Drag-to-Create Availability Bug Report

## 📋 **Issue Summary**
When dragging to select time slots for teacher availability, multiple API calls are made instead of one, resulting in duplicate availability slots being created in the database.

## 🎯 **Expected Behavior**
- User drags across time intervals (e.g., 9:00 AM - 5:00 PM)
- Single API call creates one availability slot
- UI shows optimistic update with single slot

## ❌ **Actual Behavior**
- User drags across time intervals
- Multiple API calls (typically 2-7 calls depending on week view)
- Multiple duplicate slots created
- UI shows multiple overlapping slots

## 🔍 **Root Cause Analysis**

### **Architecture Issue**
The problem occurs because **week view renders 7 separate `CalendarBodyDayContent` components**, each with:
- Its own `handleMouseUp` callback
- Its own global `mouseup` event listener
- Its own drag state management

When a user drags and releases the mouse, **multiple components detect the mouseup event** and each tries to create an availability slot.

### **Current Safeguards (Ineffective)**
- ✅ Global saving context (`GlobalSavingProvider`)
- ✅ `globalSaving` state check in `handleMouseUp`
- ✅ Early returns with `isDragging` validation
- ✅ UI interaction blocking during save
- ❌ **Multiple component instances bypass these safeguards**

## 🧪 **Debugging Evidence**

### **Console Logs Pattern**
```
[Mon Jan 01] handleMouseUp triggered - isDragging: true, globalSaving: false
[Tue Jan 02] handleMouseUp triggered - isDragging: true, globalSaving: false
[Wed Jan 03] handleMouseUp triggered - isDragging: true, globalSaving: false
...
Multiple POST /api/teacher-availability requests
```

### **Component Instance Count**
- **Week view**: 7 `CalendarBodyDayContent` components
- **Day view**: 1 `CalendarBodyDayContent` component
- **Month view**: Not implemented yet

## 🔧 **Proposed Solutions**

### **Solution 1: Single Global Drag Manager (Recommended)**
Create a `CalendarDragManager` component that:
- Manages drag state globally across all day components
- Attaches single `mouseup` listener to calendar root
- Delegates drag events to appropriate day component
- Prevents multiple simultaneous saves

```typescript
// New component structure
<CalendarDragManager>
  <CalendarBodyWeek>
    <CalendarBodyDayContent /> // No longer manages its own drag
    <CalendarBodyDayContent />
    // ...
  </CalendarBodyWeek>
</CalendarDragManager>
```

### **Solution 2: Event Delegation**
- Attach single `mouseup` listener to calendar container
- Use event delegation to determine which day was dragged
- Route events through single handler

### **Solution 3: Component Communication**
- Use React context to coordinate between day components
- Only allow one component to be "active" during drag
- Broadcast drag completion to all components

## 📁 **Affected Files**

### **Core Components**
- `src/components/calendar/body/day/calendar-body-day-content.tsx` - Main drag logic
- `src/components/calendar/body/week/calendar-body-week.tsx` - Renders 7 day components
- `src/components/calendar/calendar-provider.tsx` - Context setup

### **Context & State**
- `src/lib/global-saving-context.tsx` - Global saving state (current workaround)
- `src/components/calendar/calendar-types.ts` - Type definitions

### **API**
- `src/app/api/teacher-availability/route.ts` - Receives duplicate requests

## 🧪 **Testing Scenarios**

### **Reproduction Steps**
1. Navigate to `/dashboard/teacher/availability`
2. Switch to **Week view**
3. Click and drag across multiple time intervals (e.g., 9:00-17:00)
4. Release mouse button
5. Check browser console and database

### **Expected Debug Output**
```
[CalendarDragManager] Drag started on Monday
[CalendarDragManager] Drag completed: Mon 9:00-17:00
[API] POST /api/teacher-availability (single call)
```

## 🚀 **Implementation Plan**

### **Phase 1: Diagnosis (Current)**
- ✅ Identify multiple component instances as root cause
- ✅ Confirm drag state isolation between components

### **Phase 2: Global Drag Manager**
- Create `CalendarDragManager` component
- Move drag state to global level
- Update day components to be drag-aware but not drag-managing

### **Phase 3: Testing & Refinement**
- Test all view modes (day/week/month)
- Verify no regressions in existing functionality
- Add comprehensive drag testing

## 📊 **Impact Assessment**

### **Severity**: High
- **User Experience**: Frustrating - unexpected duplicate slots
- **Data Integrity**: Database pollution with duplicate records
- **Performance**: Multiple unnecessary API calls

### **Scope**: Medium
- **Affected**: Teacher availability management
- **Users**: Teachers creating availability
- **Views**: Primarily week view (day view likely unaffected)

## 🔗 **Related Issues**
- Calendar component architecture needs refactoring
- Drag interaction patterns inconsistent across views
- Global state management for calendar interactions

## 📝 **Next Steps**
1. Implement `CalendarDragManager` component
2. Refactor `CalendarBodyDayContent` to remove local drag management
3. Test thoroughly across all scenarios
4. Update component documentation

---

**Status**: ✅ **FIXED** (2025-10-10)  
**Priority**: High  
**Solution**: See [DRAG_STABILITY_FIX.md](./DRAG_STABILITY_FIX.md) for full implementation details.

## 🎯 Final Solution Summary

The root cause was **unstable React callbacks** causing the `mouseup` effect to re-run multiple times. The fix involved:

1. **Making `completeDrag` truly stable** with empty dependency array
2. **Using refs to access current state** instead of closure captures
3. **Preventing effect re-runs** during drag operations

This eliminated the need for complex workarounds and provides a clean, performant solution that works correctly with React Strict Mode.
