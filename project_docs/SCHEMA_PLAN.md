# Phase 3 schema plan

Status: proposal, 2026-10-27, waiting for validation. Scope: MVP_REWORK_PLAN.md section 3 and decisions D1 to D37. Phase: APP_BUILD_PLAN.md phase 3.

## Rules for every new table

1. Ids are text (`generateId()`), times are `integer` timestamps, like the existing tables.
2. **Real foreign keys** with an explicit `onDelete`. `teacher_classes` has none, and its orphaned rows already caused wrong hours (review of 2026-10-27). Turso/libSQL enforces foreign keys; a data test checks it.
3. Every row that belongs to a school carries `school_id`, so every query can be scoped by school without a join.
4. Migrations only: generate with `bun run db:generate`, never `db:push`. First migration of the phase adds the missing `time_slot_templates`.

## Tables

Calendar

| Table | Columns | Keys |
|---|---|---|
| `academic_years` | school, label (« 2025-2026 »), starts_on, ends_on, is_current | one current year per school |
| `terms` | school, academic_year, number (1 to 3), label (« Trimestre 1 »), starts_on, ends_on, council_on | unique (year, number) |

Teaching and work

| Table | Columns | Keys |
|---|---|---|
| `topics` | school, class, subject, title, position | |
| `posts` | school, class, subject, topic?, author, type (lesson, material, assignment), title, body, due_at?, max_grade (20), coefficient (1), term?, notion?, published_at | index (class, subject) |
| `attachments` | school, post? or submission?, uploader, storage key (R2, D3), file name, mime, size | exactly one owner |
| `submissions` | school, post, student, status (assigned, submitted, late, returned), body, submitted_at, returned_at | unique (post, student) |
| `grades` | school, student, class, subject, term, post? (empty for a paper test), title, value /20 (empty = absent), coefficient, comment, graded_by, graded_at | index (class, subject, term) |
| `attendance_records` | school, student, timetable slot, date, status (present, absent, late, excused), minutes_late, justification, justified_by, justified_at, recorded_by, recorded_at | unique (slot, date, student) |
| `notifications` | school, user, kind, payload (JSON), read_at, emailed_at | index (user, read_at) |

Programme (D7, D8, D9, D35)

| Table | Columns | Keys |
|---|---|---|
| `programmes` | school, subject, level, created_by (admin) | unique (school, subject, level) |
| `chapters` | programme, position, title, term_number? | cascade on programme |
| `notions` | chapter, position, title | cascade on chapter |
| `class_chapter_plans` | class, chapter, position, planned_week, status (à venir, en cours, terminé) | unique (class, chapter) |
| `notion_coverage` | class, notion, post? (the cahier de textes entry), covered_on, confirmed_by | unique (class, notion) |

Follow-up and conseil (D10 to D14, D34, D36, D37)

| Table | Columns | Keys |
|---|---|---|
| `remarks` | school, student, subject?, author, body, visible_to_family (false) | index (student) |
| `student_flags` | school, student, subject?, term, source (rule, teacher), rule? (average, absences, missing_work), reason, created_by?, dismissed_by?, dismissed_at? | one open rule flag per (student, subject, term, rule) |
| `school_settings` | school (primary key), flag_average_below (10), flag_unjustified_absences (3), flag_missing_works (2), flags_visible_to_students (false), flags_visible_to_parents (false) | empty threshold = rule off (D34) |
| `appreciations` | school, student, term, subject? (empty = appréciation générale, D37), author, body | unique (student, term, subject); plus a partial unique index for the générale, since SQLite treats empty values as distinct |
| `message_threads` | school, student, teacher, last_message_at | unique (student, teacher) |
| `messages` | thread, author, body, read_by_family_at, read_by_teacher_at | cascade on thread |

Changes to existing tables

1. `classes.head_teacher_id` (professeur principal), nullable, foreign key to `users`.
2. `school_settings` replaces the separate `flag_rules` table listed in the MVP plan: one row per school holds the thresholds and the switches.

## Order of work

1. Migration for `time_slot_templates`; switch the scripts to migrations.
2. Calendar, then teaching and work, then programme, then follow-up: one migration each, each with a data test (keys, cascades, the partial unique index).
3. A seed that matches the mock data (Aïssatou Diop, 3ème B with 31 students, week 8 of 12, Khady Fall's four grades) so screens can be checked against the mocks.

Estimate: 1 to 2 days.
