# App build plan

Status: plan, 2026-10-27. Starts after the design system (D32) landed in code. Scope and data model: `MVP_REWORK_PLAN.md`. Decisions: `DECISIONS.md`.

## 1. Where we are

| Area | State |
|---|---|
| Stack | Next 16, React 19.3 (React Compiler on), Tailwind v4, Radix, Drizzle on libSQL, NextAuth 5, Bun |
| Design system | A+ Plat vif in `src/app/globals.css` and `src/components/ui/` (24 restyled, 2 new: `switch`, `progress`). Preview: `/design-system` (dev only) |
| Checks | `bunx tsc --noEmit` clean · `bun run lint` 0 errors, 30 warnings · `bun test` 1 test · `bun run build` passes |
| Data | 16 tables (structure, accounts, timetable). None of the MVP teaching tables exist yet |
| Screens | Admin and superadmin pages from the first version, with the interim lilac look and the `useEffect` fetch pattern. Teacher home is a stub. No parent or student routes |
| Mocks to build from | `.impeccable/mocks/teacher/` (Programme, Élèves, Correction, Appel) and `.impeccable/mocks/teacher-home/studio-vif-desktop.html` |

## 2. Phases

Each phase ends with every check green and a screenshot of the new screen next to its mock.

| # | Phase | Contents | MVP step | Estimate |
|---|---|---|---|---|
| 1 | Shell and routes | The A+ dock and page header as layout components; one route tree per role (IA, MVP plan section 5); French copy in the shell; empty states that name the next action | 2 | 1 day |
| 2 | Data access pattern | Server components read through `src/lib/data/<area>.ts`; writes through server actions with zod; one auth helper per role. Rebuild one admin page this way as the reference, then turn the four React Compiler rules back to "error" for new code | 2 | 1 day |
| 3 | Schema | `academic_years`, `terms`, `topics`, `posts`, `attachments`, `submissions`, `grades`, `attendance_records`, `notifications`, then the D7 to D14 tables (`programmes`, `chapters`, `notions`, `class_chapter_plans`, `notion_coverage`, `remarks`, `student_flags`, `flag_rules`, `appreciations`, `message_threads`, `messages`). Seed script with the demo data of the mocks | 3 | 1 to 2 days |
| 4 | Teacher home | Studio A+ with live data: today's courses, live course, copies to grade, grade pace, Programme and Élèves à suivre summaries | 7 | 1 to 2 days |
| 5 | Class space | Tabs Travail, Programme, Élèves, Notes, Présences, Emploi du temps (mocks: `classe-programme`, `classe-eleves`) | 4, 10, 11 | 3 to 4 days |
| 6 | Grading loop | Post an assignment, submissions, the correction screen (mock: `correction`), gradebook /20 with coefficients | 5 | 2 to 3 days |
| 7 | Attendance | Register per slot, phone first (mock: `appel-phone`), parent justification | 6 | 2 days |
| 8 | Other roles | Parent and student homes, appréciations (D18), family thread (D14), weekly digest (D2) | 7, 8, 12, 13 | 3 to 4 days |
| 9 | Admin setup | Guided setup flow; rebuild the remaining admin pages on the phase 2 pattern | 9 | 2 days |

Before phase 3 and phase 8, answer the four open questions at the end of `DECISIONS.md` (flag thresholds, who loads the programme, whether students see flags, appréciation générale).

## 3. How each feature is built

Taken from the Claude Code best practices (code.claude.com/docs/en/best-practices) and applied to this repo.

1. **Say what it can't see.** Each feature starts from a short brief that names the mock file, the decision IDs and the data it needs. Anything decided in conversation goes into `DECISIONS.md` the same day.
2. **Plan, then code.** Plan mode for anything that touches the schema or more than one route. One feature per branch and per PR.
3. **Give it a check to run.** Done = `bunx tsc --noEmit`, `bun run lint` (0 errors), `bun test`, and a screenshot of the route next to the mock. Logic that can break (grade averages, pace, flag rules, route access) gets one small `bun test` file next to it.
4. **Review with fresh eyes.** Run `/code-review` on the diff before merging; the reviewer never saw the session.
5. **Keep context clean.** `/clear` between features. When the same correction is needed twice, add it to `CLAUDE.md`.
6. **Run in parallel only when independent.** Use worktrees for features that touch different routes (for example parent home and admin setup).

## 4. Rules to enforce (proposals, need your OK)

Instructions in `CLAUDE.md` can be skipped; these would be enforced by the harness in `.claude/settings.json`:

1. A deny rule on reading `.env*` files.
2. A `Stop` hook that runs `bunx tsc --noEmit` and blocks the end of a turn on type errors (about 20 s per run).
3. A `PreToolUse` hook that refuses edits to `src/app/fonts/*.woff2` and `bun.lock` outside `bun add`.

## 5. Hygiene left

1. Untracked folders not created by this work: `.cursor/plans/`, `.taste-skill/`, `prototype/`. Commit, ignore or delete: your call.
2. 30 lint warnings from the legacy pages; they disappear as phases 2 and 9 rebuild those pages.
3. The old pages still hardcode the interim lilac and greys; replace them when a phase touches the page.
