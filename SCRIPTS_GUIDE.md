# Database Scripts Guide

Quick reference for database management scripts.

## 🗑️ Reset Database

**Script:** `scripts/reset-database.ts`

Safely deletes all school-related data while **preserving superadmin accounts**.

```bash
bun run scripts/reset-database.ts
```

### What it deletes (in order):
1. Timetable slots
2. Teacher availability
3. Teacher assignments
4. Student enrollments
5. Time slots
6. Subjects
7. Classes
8. Academic levels (class groups)
9. Invitations
10. Non-superadmin users
11. Schools

### What it preserves:
- ✅ Superadmin accounts
- ✅ Database schema/structure

---

## 🌱 Seed Database

**Script:** `scripts/seed-timetable-data.ts`

Creates comprehensive sample data with proper hierarchical relationships.

```bash
bun run scripts/seed-timetable-data.ts
```

### What it creates:

#### School Structure
- **1 School:** École Internationale de Dakar
- **1 Admin:** admin@ecole-dakar.edu (Password: Admin@123)

#### Academic Hierarchy
- **2 Class Groups:**
  - Primary: 10 classes (CP A/B through CM2 A/B)
  - Secondary: 14 classes (6ème A/B through Terminale A/B)

#### Resources (Global Libraries)
- **16 Unique Subjects** with weekly hour quotas:
  - Primary subjects: French (6h), Math (5h), Science (3h), etc.
  - Secondary subjects: Math (5h), French (5h), Physics (4h), etc.
- **17 Teachers:**
  - 7 Primary teachers
  - 10 Secondary teachers
  - All with Mon-Fri availability (8:00-17:00)

#### Assignments
- **Complete teacher-class-subject assignments:**
  - Primary: 80 assignments (10 classes × 8 subjects)
  - Secondary: 154 assignments (14 classes × 11 subjects)
  - Every class has all required subjects with qualified teachers

#### Students
- **480 Students** (20 per class)
- All enrolled in their respective classes

#### Time Slots
- **55 Time Slots** (5 days × 11 slots per day)
- Includes teaching periods and breaks
- Mon-Fri, 8:00 AM - 4:50 PM

### Sample Credentials

**Admin:**
```
Email: admin@ecole-dakar.edu
Password: Admin@123
```

**Teachers:**
```
Email: [firstname.lastname]@school.edu
Password: Teacher@123
Examples:
- marie.diop@school.edu
- amadou.ba@school.edu
```

**Students:**
```
Email: student[N].[classname]@school.edu
Password: Student@123
Examples:
- student1.cpa@school.edu
- student5.cm2b@school.edu
```

---

## 🔄 Complete Reset & Reseed

For a completely fresh start:

```bash
# 1. Delete all data (preserves superadmin)
bun run scripts/reset-database.ts

# 2. Create fresh sample data
bun run scripts/seed-timetable-data.ts

# 3. Login as admin and explore
```

---

## 📋 Safety Features

### Reset Script
- ✅ Preserves superadmin accounts
- ✅ Deletes in correct dependency order
- ✅ Clear console output for each step
- ✅ Error handling with proper exit codes

### Seed Script
- ✅ Checks for existing data (won't duplicate)
- ✅ Creates proper relationships
- ✅ Sets realistic weekly hours for subjects
- ✅ Ensures every class has all required teachers
- ✅ Comprehensive validation

---

## 🚀 New Navigation Structure

After seeding, explore using the new hierarchical navigation:

### Academic Structure (dropdown)
- **Class Groups** - View Primary and Secondary groups
- **Classes** - See all 24 classes organized by group

### Resources (dropdown)
- **Subjects Library** - Browse all 16 subjects with weekly hours
- **Teachers** - View all 17 teachers with their assignments

### Scheduling (dropdown)
- **Time Slots** - Manage 55 time slots across the week
- **Timetables** - Auto-generate or build manually

### Settings (dropdown)
- **Users & Access** - Manage all 498 users (1 admin + 17 teachers + 480 students)
- **Invitations** - Invite new users to the system

---

## 💡 Tips

1. **Always reset before reseeding** to avoid duplicate data
2. **Superadmins are preserved** - you can always login after reset
3. **Weekly hours are set** - auto-scheduler will use these quotas
4. **All relationships are complete** - ready for timetable building immediately
5. **Scripts are idempotent** - safe to run multiple times (seed checks for duplicates)

---

## 🐛 Troubleshooting

### "School already exists" error
The seed script detected existing data. Run reset first:
```bash
bun run scripts/reset-database.ts
bun run scripts/seed-timetable-data.ts
```

### Lost superadmin access
Check if superadmin still exists:
```bash
bun run scripts/seed-superadmin.ts
```

### Database locked error
Stop the dev server, run the script, then restart:
```bash
# Stop dev server (Ctrl+C)
bun run scripts/reset-database.ts
bun run scripts/seed-timetable-data.ts
bun run dev
```

---

## 📊 Data Hierarchy Diagram

```
School (École Internationale de Dakar)
│
├── Class Groups (Academic Levels)
│   ├── Primary
│   │   └── 10 Classes (CP A through CM2 B)
│   │       ├── 8 Subjects each (French, Math, Science, etc.)
│   │       ├── 7 Teachers (shared across classes)
│   │       └── 20 Students per class
│   │
│   └── Secondary
│       └── 14 Classes (6ème A through Terminale B)
│           ├── 11 Subjects each (Math, Physics, Bio, etc.)
│           ├── 10 Teachers (shared across classes)
│           └── 20 Students per class
│
├── Resources (Global Libraries)
│   ├── 16 Unique Subjects (with weekly hour quotas)
│   └── 17 Teachers (with availability schedules)
│
└── Scheduling
    └── 55 Time Slots (Mon-Fri, 8 slots + 3 breaks per day)
```

---

**Last Updated:** October 13, 2025

