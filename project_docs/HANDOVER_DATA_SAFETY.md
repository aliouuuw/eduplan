# Agent handover: data safety and product usability

Updated: 2026-10-28. Repository: `/Users/aliouwade/Documents/drafts/eduplan`.

## Start here

The user wants EduPlan to work for different schools and teachers, not only the demo.
The review covers product flows, data ownership, usability, and query volume.
Do not reduce the request to adding indexes or completing mock screens.

The immediate data-safety slice is implemented and tested, but uncommitted.
Invitation pagination/search is wired into the admin screen and browser-checked (2026-10-28), also uncommitted.
The larger product changes below remain unfinished; documenting them is not implementation.

## Working state

| Item | State at handover |
|---|---|
| Branch | `fix/teaching-data-integrity` |
| Latest existing commit | `239a41e fix(data): key class space by class and subject` |
| Worktree | Modified and untracked files from the data-safety and invitation-UI sessions; nothing committed |
| Last successful check | 2026-10-28 `bun run check`: TypeScript passes, 43 tests pass, lint has 0 errors and 29 existing warnings |
| Database | Migration 0011 generated and tested in memory; not applied to any configured school database |
| UI verification | Invitation screen checked at 1440 and 375 px with the installed Playwright Chromium (user-approved fallback) |
| Preview server | Stopped; the scratch database copy is not the normal app database |

Recheck `git status`, the diff, and the branch before editing. Preserve existing work.
Do not assume this snapshot stays current if another agent or the user edits the repository.

## Read in order

1. `CLAUDE.md`, `AGENTS.md`, `PRODUCT.md`.
2. `project_docs/SCALABILITY_AND_USABILITY.md`: delivered work, corrected review claims, migration procedure, open gates.
3. `project_docs/DECISIONS.md`: especially D17, D32-D39.
4. `project_docs/APP_BUILD_PLAN.md` and `project_docs/MVP_REWORK_PLAN.md`.
5. The changed source files and tests listed below.

Before changing Next.js code, read the relevant installed guide in `node_modules/next/dist/docs/`.
Use Bun. Do not introduce another lockfile or dependency without a demonstrated need.
Do not use subagents unless the user explicitly requests them.

## Implemented in the uncommitted diff

### Database integrity and indexes

- `src/db/schema.ts` and `src/db/migrations/0011_teaching_integrity_and_read_indexes.sql`.
- Migration metadata: `src/db/migrations/meta/0011_snapshot.json` and `_journal.json`.
- Unique submissions: school + post + student.
- Unique attendance: school + timetable + date + student.
- Unique grade per non-null submission, per school; standalone grades remain repeatable.
- Separate subject and general appreciation unique keys. A nullable subject alone does not enforce general-appreciation uniqueness in SQLite.
- At most one current academic year per school.
- Read indexes for the changed query paths; four access paths have `EXPLAIN QUERY PLAN` checks.

The migration adds indexes only. It deliberately fails on conflicting data rather than deleting or choosing rows.
`scripts/check-teaching-integrity.ts` is a read-only preflight for those conflicts.
It has not been run against a configured school database.

### Teacher reads

- `src/lib/data/teacher-home.ts`: exact class-and-subject grade scope; SQL weekly grade counts and submission-status counts.
- Flags join active current-year enrolments, school-owned students/classes, and authorised course assignments.
- Professeur principal sees all subjects' flags in their current classes (D17/D36), without expanding the grading scope.
- Multiple matching enrolments produce combined class names instead of selecting an arbitrary first row.
- Attendance counts use one grouped query, not one query per slot.
- Home lessons require the current year and active timetable status.
- Unsubmitted work no longer counts as graded; only returned submissions do.
- No current year means empty current-year home/classes, not all archived classes.
- `src/lib/data/teacher-classes.ts`: stronger school-owned class/subject joins for permissions.
- `src/lib/data/class-programme.ts`: class-year lookup, active timetable filtering, school predicates, and SQL enrolment count.
- `src/lib/data/teacher-home-math.ts`: removed the now-unused raw-row grade aggregation helper.

These fixes do not add year/term selection, a flag computation engine, or a platform-wide tenant audit.
Existing flags still lack explicit class/term ownership.

### Invitation queries and screen

- `src/lib/data/invitations.ts`: new `getInvitationPage` and `INVITATIONS_PAGE_SIZE` (25).
- Validates query/page input; clamps a page to the available result range.
- Orders by creation time and ID to handle tied timestamps.
- Searches email literally, escaping SQL wildcard characters.
- Returns whole-school status totals separately from search matches and page rows.
- Offset pagination has a deliberate ceiling documented in the code; measure before replacing it with cursors.
- `listInvitations` is deleted; the tests read through `getInvitationPage`.
- `src/app/dashboard/admin/invitations/page.tsx` reads async `searchParams` (`q`, `page`) after `requireSchoolRole('admin')`; the school comes from the session only.
- Search is a plain GET form (`role="search"`, labelled input): no client JS, Enter submits, a new search drops `page`.
- Previous/next are links that keep `q`; page 1 stays out of the URL. Disabled buttons at the ends.
- Stat cards use the school-wide totals. Empty school and no-match are separate empty states; no-match links back to the full list.
- Long emails wrap (`break-all`); the row has a 16 rem basis so its actions drop below it on phones.

### Tests

- `src/lib/data/teaching-integrity.test.ts`: duplicate rejection, nullable cases, school isolation, index plans, and dirty-data index failure without deletion.
- `src/lib/data/teacher-home.test.ts`: subject/course isolation, old work, foreign-school copies, draft lessons, PP scope, and constant query count as flags grow.
- `src/lib/data/class-programme.test.ts`: archived-class year context and malformed cross-school assignment denial.
- `src/lib/data/invitations.test.ts`: bounded/stable pages, whole-school totals, literal search, empty matches, and invalid page input.
- `src/lib/data/test-db.ts`: optional query logger for the query-count check; tests replay real migrations into memory.

## Browser verification (2026-10-28)

The Playwright MCP still needs Google Chrome, which is not installed. The user approved a fallback:
the installed Playwright Chromium headless shell (`~/Library/Caches/ms-playwright/chromium_headless_shell-1194`)
driven by `playwright-core` from the session scratchpad. No browser was installed; the MCP config is unchanged.

Isolated data: a copy of `/tmp/eduplan-review.rKHe2w/preview.db` in the session scratchpad (test school
`preview-school`, admin `admin@preview.test`, 62 artificial invitations plus one 95-character email).
The test password was set on the copy only. Server: `TURSO_DATABASE_URL=file:<copy> bunx next dev -p 3107`.
The normal `local.db` was not read or written, and `seed:demo` was not run.

| Check | Result |
|---|---|
| Page 1 / 2 / 3 rows | 25 / 25 / 13; "Suivante" disabled on page 3 |
| Stat totals while paging and searching | Constant: 42 en attente, 21 acceptées, 0 expirée |
| Keyboard search (focus, type, Enter) | `?q=enseignant0`, "1–25 sur 62 résultats" |
| Page 2 of a search | URL keeps `q`; the input keeps its value |
| New search from page 2 | Page resets: `?q=enseignant06`, 2 results |
| Literal `%_` search | 0 rows, "Aucune adresse ne correspond"; reset link returns 25 rows |
| `?page=99` | Clamps to the last page: "51–63 sur 63" |
| Delete the only row of the last page | Re-renders on the previous page: "26–50 sur 50" |
| Phone 375 px | No horizontal scroll (scrollWidth 375); long email wraps; actions sit under the row |

Found and fixed during the check: on phones `break-all` let rows shrink to 79 px (a 19,000 px page);
the row basis fixes it (5,400 px). "Page 2 sur 3" no longer wraps.

Console: direct loads of the list, a searched page 2, and the no-match page log no errors at 1440 or 375 px.
The fast scripted run logged two Auth.js `ClientFetchError: Failed to fetch` and one hydration-attribute warning.
They did not reproduce on direct loads. Likely aborted session fetches during rapid `page.goto`; not investigated further.

## Next implementation slice

Invitation pagination/search is done. Commit it separately from the data-safety slice:
`feat(admin): paginate and search the invitation list`.
The next slice is a product choice from "Larger work" below. Do not start it before the user picks.
Do not cap dashboard work lists without a functioning full-list destination.

## Larger work: resolve before implementing

The full checklist and acceptance scenarios are in `SCALABILITY_AND_USABILITY.md`.
The following are not shipped:

| Gate | Question or required change |
|---|---|
| Multi-school identity | One login identity, school memberships, multiple roles, invitation acceptance for an existing identity, switching and revocation. Keep unique login email; do not merely drop the constraint |
| Annual class lifecycle | Decide whether each class row is an annual cohort. Deriving child records' year through a class is unsafe if the class is repurposed next year |
| Explicit academic context | Select year/term deliberately, validate school ownership, support historical views; plan the year-label backfill before replacing keys |
| Programme per grade | Primaire/Secondaire is too broad. Introduce explicit grade identity, not display-name parsing |
| Automatic student follow-up | D34 rules need course/term context, recomputation and dismissal semantics, weighted grades, justified absences, and due-date-aware missing work |
| Resilient attendance | Actual lesson occurrences, cancellations, idempotent writes, save/error states, offline privacy and conflicts, explicit register completion |
| School onboarding and scale | Guided setup, paginated/searchable work lists, meaningful unset-target states, tenant-integrity audit, representative load measurements |

Do not treat proposed identity or year architecture as an accepted product decision.
Obtain the necessary product choices and record accepted decisions in `DECISIONS.md`.
Implement one coherent phase per branch; do not attempt the whole platform in one unreviewable migration.

## Migration and commit safety

- Ask before accessing a remote database, installing tools, or using network access.
- Back up the target database before migration. Inspect migration history before running a preflight that assumes the teaching tables already exist.
- Run the read-only integrity preflight only against an explicitly selected environment.
- If duplicates exist, stop for a reviewed reconciliation; do not delete automatically.
- Inspect existing migrations too: this slice does not prove older migrations are safe on populated databases.
- Use checked-in migrations, not an unreviewed `db:push`. This handover does not establish a production migration runner.
- No commit is made. Proposed data-safety message: `fix(data): enforce teaching integrity and scope teacher summaries`.
- Commit the invitation screen separately (message above). Review the final diff before staging; never add attribution trailers.

## Prompt for the next agent

```text
Continue EduPlan from project_docs/HANDOVER_DATA_SAFETY.md.
Read that handover and project_docs/SCALABILITY_AND_USABILITY.md first.
Verify the branch and uncommitted diff; preserve the existing work.

The data-safety slice and the invitation pagination/search screen are
implemented and browser-checked (installed Chromium fallback, isolated
scratch DB). The last check passes 43 tests, TypeScript, and lint with
0 errors and 29 existing warnings. No configured school database is migrated.

Ask before committing. Then take the next slice the user picked from
the remaining gates. Do not describe multi-school accounts, term
selection, automatic flags, or offline attendance as complete. Ask for
unresolved product choices before making irreversible schema/auth decisions.
```
