# Scalability and usability

Updated 2026-10-28. Follow-up to the Cursor review and the product-engineering review.
This is a delivery checklist, not a claim that all features below exist.

## Corrections to the review

- School sizes and latency were illustrative, not measured. No capacity limit is established.
- Primary keys and unique indexes already existed. Migration 0011 adds read indexes for specific queries; it does not prove that every existing query scans a whole table.
- Teacher-home grades were filtered in SQL by school, term, and class, not only in JavaScript. The missing restriction was the exact class-and-subject assignment.
- Grades have no teacher/author column. Scope is the assigned course, not an invented `grades.teacherId`. Two teachers of the same course see the same course grades.
- A school-creation screen exists at `/dashboard/superadmin/schools`. The missing product flow is guided school setup, not basic school creation.
- Attendance writes are not implemented in the new teaching loop. Offline submission is a requirement to design, not a verified report of lost taps.

## Delivered: data-read and duplicate safety

| Concern | Change | Check |
|---|---|---|
| Duplicate submissions | Unique school + post + student | Migration replay and rejected duplicate test |
| Duplicate attendance | Unique school + timetable + date + student | Duplicate test; allows an update to the same row |
| Duplicate grades | One grade per non-null submission, per school | Standalone grades with no submission remain repeatable |
| Duplicate appreciations | One per school + student + term + subject; separate unique key for the general appreciation | Explicit null-subject test |
| Ambiguous current year | At most one current year per school | Duplicate test; no current year returns empty current-year home/classes |
| Wrong subject's grades | Exact assigned class-and-subject pairs in SQL | Other-subject regression test |
| Overbroad flags | Join current active enrolments, school-owned classes and students, and exact subject assignments | Untaught-class test |
| PP follow-up (D17, D36) | Head teacher sees all subjects in their current classes; grading scope stays unchanged | PP test |
| Arbitrary first enrolment | Resolve through authorised current enrolments; show all matching class names rather than picking a random row | Grouped flag query |
| Repeated network queries | One joined flag query; one grouped attendance query for today's entries | Flag-volume query-count test |
| Every copy loaded for a summary | SQL counts by assignment and submission status | Existing demo totals and foreign-school-copy test |
| Every grade loaded for a chart | SQL counts by week | Existing chart total and other-subject test |
| Unsubmitted work shown as graded | Only `returned` counts as graded | Correction-count assertion |
| Archived and draft timetable entries | Home uses current year and active status; class programme uses its own class year | Old-year and draft regression test |
| Cross-school references without foreign keys | School predicates on the joins changed in this slice | Foreign-school copy test and class access joins |
| Query access paths | Targeted indexes in migration 0011 | `EXPLAIN QUERY PLAN` tests for four key paths |

These reads still do not establish a production latency target. Query count staying constant is not a load test.
The dashboard flag list and correction list are still unbounded within the current year.

## Safe migration procedure

1. Back up the database using the deployment's existing backup process.
2. Run the read-only preflight against the target environment (it also counts classes whose year label has no `academic_years` row; 0012 leaves those unlinked):
   `bun --env-file=.env.local run scripts/check-teaching-integrity.ts`.
3. Stop if any duplicate-group count is non-zero. Review the rows with the school owner. Do not delete automatically.
4. Apply checked-in migrations through the deployment migration runner. Do not use `db:push` as a substitute.
5. Run the preflight again and verify the teacher home.

Migration 0011 adds indexes only. It does not merge rows, rewrite grades, or remove duplicates.
No configured local or remote school database was migrated during this work.

## Remaining delivery gates

### 1. Identity and membership, before a multi-school pilot

Scenario: a teacher works in two schools and has a child in one of them.

- Keep one login identity and its globally unique email. Put school access and roles on memberships.
- Plan the migration from `users.schoolId` and `users.role` before changing either field.
- Accept invitations for an existing identity without creating a second password or replacing existing access.
- Make school/role selection explicit. Check the selected membership again on every server read and write.
- Test revocation, stale sessions, school switching, and a forged school identifier.

Status: proposed architecture, not implemented or an accepted replacement for the current auth model.
Do not merely remove the email unique constraint.

### 2. Year and term context, before grading and year rollover

Scenario: a teacher enters last term's grades during a holiday.

- Give the teacher an explicit year and term selection, including read-only historical views.
- Validate that the term belongs to the selected school's year on the server.
- Decide whether the selected context lives in the URL or session; do not assume the clock chooses the intended term.
- Replace year labels as relational keys with `academic_years.id` after an inventory and backfill plan.
- Decide whether a class row is an annual cohort. Deriving a post's year through its class is safe only if the class is never repurposed next year.

Status (2026-10-28, branch `feat/academic-context`): D40 and D41 accepted.
- Migration 0012 adds `classes.academic_year_id` (foreign key, backfilled from the label within the same school) and `terms.closed_at`.
- `src/lib/data/academic-context.ts` resolves year and term (URL term checked against the school, default term, `editable`). Teacher home, class list, and class programme use it and filter classes by year ID.
- The class update route refuses a year change once students are enrolled.
- Réglages (`/dashboard/admin/parametres`, branch `feat/admin-academic-years`): the admin creates a year with its trimestres (validated: inside the year, in order, no overlap; unique name; no overlapping year), switches the current year, and closes or reopens a term. Creating a year links the school's classes that carry its label. Browser-checked at 1440 and 375 px on an isolated scratch database.
Still open: no page reads `?term=` yet (the grading loop is the first); editing or deleting a year or term; enrolments and timetables still key on the year label.

### 3. Find work at real volumes, before expanding the class tabs

Scenario: a teacher has eight class-and-subject assignments and several hundred students.

- Add server-side student search and deterministic pagination to rosters and work lists when those routes are built.
- Paginate the existing invitation list; its summary counts must cover the whole school, not just the current page.
- Add a bounded home preview only with a functioning full-list destination; never hide remaining work behind a dead link.
- Keep totals in SQL. Avoid one query per student, flag, or timetable entry.
- Measure representative schools with multiple years of data before setting a latency or capacity claim.

Status: aggregation delivered on teacher home; invitation pagination/search delivered; roster/work-list pagination and load measurement remain open.

The invitation data layer now provides `getInvitationPage`: 25 rows maximum,
stable ordering when timestamps tie, school-wide status totals, literal email search,
and page clamping after deletion or an invalid page request. Tests cover school isolation,
wildcard characters, empty results, and totals across pages.

The admin invitation screen uses it (2026-10-28): GET search form, previous/next links that keep the search,
school-wide stat totals, separate empty and no-match states. Browser-checked at 1440 and 375 px on an isolated
scratch database; results in `HANDOVER_DATA_SAFETY.md`. Rosters and teacher work lists are still unpaginated.

### 4. Programme and follow-up, before presenting automated advice

Scenario: 6eme and 3eme share the Secondaire level, but do not share a maths programme.

- Add an explicit grade in the class ladder; do not parse it from the class display name.
- Scope programme selection by grade and subject (with school-specific content), not only Primaire/Secondaire.
- Compute D34 flags per class/course and term; store that context so old flags do not leak into a new year.
- Define when recomputation runs, how corrections clear a flag, and how dismissals survive a repeated calculation.
- Separate missing work from work not yet due; use weighted averages and only unjustified absences.

Status: PP visibility fixed; programme grade identity and automatic flags remain open.
The seeded flags are examples, not evidence that automatic detection works.

### 5. Attendance safety, before shipping the phone register

Scenario: a lesson is cancelled, or two devices save attendance over a weak connection.

- Represent actual lesson dates, holidays, cancellations, and rescheduling separately from the weekly template.
- Use an idempotent save/upsert against the unique attendance key.
- Show saving, saved, and failed states; preserve edits after a failed save.
- Design offline retention, explicit retry, logout cleanup, and conflict handling before adding a background queue for children's data.
- Detect register completion directly. Zero absences does not mean attendance was not taken.

Status: unique key and batched absence counts delivered; lesson occurrences, writes, and offline support remain open.

### 6. School setup and data integrity, before onboarding another school

- Guide admins through year, terms, grades, subjects, classes, teachers, enrolments, and timetable publication.
- Distinguish missing setup from a genuine zero; do not present an unset grade target as teacher performance.
- Clarify whether conseil targets count student grade rows or assessments, and whether targets belong to each course.
- Inventory missing foreign keys and invalid cross-school references before adding constraints with a reviewed backfill.
- Test one teacher's permissions against another school across every route, not only the reads changed here.

Status: existing school CRUD retained; guided setup and a platform-wide tenant audit remain open.

## Next delivery order

1. Review/apply migration 0011 after the read-only preflight.
2. Resolve identity/membership and annual-class lifecycle before onboarding a second school.
3. Implement explicit year/term context and paginated work lists.
4. Complete the grading loop and rule-derived follow-up with term/course ownership.
5. Complete lesson occurrences and resilient register saves.

## Verification

- Data-safety and invitation-query slices: `bun run check` passes, including 43 tests and TypeScript.
- The lint run reports 0 errors and 29 existing warnings in legacy pages. This work does not suppress them.
- All migration tests use isolated in-memory databases with the real migration chain.
- A separate temporary SQLite database holds artificial admin/invitation data for UI checks; no configured school database is seeded or migrated.
- 2026-10-28: invitation UI checked by script in the installed Playwright Chromium (Chrome is still missing for the MCP). 9 scenarios pass; see the handover table.
