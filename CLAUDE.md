@AGENTS.md

# EduPlan

School platform for francophone schools (Senegal first). Product: `PRODUCT.md`. Scope and order of work: `project_docs/MVP_REWORK_PLAN.md`. Every accepted decision: `project_docs/DECISIONS.md` (cite the ID, e.g. D32). App build plan: `project_docs/APP_BUILD_PLAN.md`.

## Commands (Bun only)

- `bun run dev`: dev server
- `bun run check`: typecheck + lint + tests in one go. Alone: `bunx tsc --noEmit`, `bun run lint`, `bun test` (`bun test path/to/file.test.ts` for one)
- `bun run build`: production build (runs tsc first)
- Done means: `bun run check` passes; UI changes are checked by screenshot against the mock. A Stop hook (`.claude/settings.json` → `scripts/check-changed.sh`) enforces the checks whenever `src/` or `proxy.ts` has uncommitted changes

## Design system

- Visual language: A+ Plat vif (D32). Tokens and rules: `src/app/globals.css` (read its header comment). Components: `src/components/ui/`. Live preview: `/design-system` (dev only).
- Screen pieces: `AppDock` and `PageHeader` in `src/components/layout/`; `Stat`/`MeterDots`/`MeterSplit`, `ListRow`, `Callout`, `EmptyState`, `Skeleton`, `SegmentedFilter`, `Avatar`, `Kbd`, `Progress`, `Switch` in `src/components/ui/`. Lists never render empty: use `EmptyState` with the next action. Long actions use `<Button loading>`.
- Reference mocks to match: `.impeccable/mocks/teacher/` (gallery `index.html`) and `.impeccable/mocks/teacher-home/studio-vif-desktop.html`.
- Use tokens (`text-now-ink`, `bg-progress-soft`, `shadow-lift`, `fill-progress`...), never raw hex in components.
- Type: Poppins (D33), in two roles: `font-display` (page and card titles, big numbers, class names) and `font-sans` (everything else). Format class names with `classLabel()` and French punctuation with `frSpaces()` from `src/lib/fr.ts`.
- UI copy is French. Grades are /20 with coefficients and trimestres.

## Workflow (code.claude.com/docs/en/best-practices)

1. One phase or fix per branch (`APP_BUILD_PLAN.md`). Start from a brief: the mock file, the decision IDs, the data needed. Plan mode when a change touches the schema or more than one route.
2. Logic that can break gets one `bun test` file next to it. Prefer a test that checks the rule everywhere (see `teacher-scope.test.ts`, `no-raw-colors.test.ts`) over one that checks a single case.
3. Before merging, run `/code-review`. Fix the root cause once in the shared function, not at each caller.
4. When a correction comes up twice, add it here.

## Gotchas

- Data pattern (reference: `src/app/dashboard/admin/invitations/`): the page is a server component that calls `requireSchoolRole()` (`src/lib/session.ts`) and reads through `src/lib/data/<area>.ts` (server-only, takes `db`, holds the business rules). Writes are server actions in `actions.ts` returning `ActionResult` (`src/lib/action-result.ts`), then `revalidatePath`. Client components only for interactions.
- Data tests use `testDb()` (`src/lib/data/test-db.ts`, in-memory with the real migrations). `bun run test` passes `--conditions react-server` so `server-only` modules load.
- Legacy pages still fetch in `useEffect` + setState; they are listed in `eslint.config.mjs` as warnings. Every other file gets those React Compiler rules as errors. Remove a file from the list when you rebuild it.
- `@radix-ui/react-slot` is pinned to ^1.5 through `overrides`: older copies render nothing for lazy server children inside `asChild`.
- Public routes live in `src/lib/public-routes.ts`. Every page under `src/app/(auth)` must be listed there; the test reads that folder. Every other route needs a session.
- Select teachers with `activeTeacher()` (`src/lib/teacher-scope.ts`), never `eq(users.role, 'teacher')`: it also excludes soft-deleted accounts. A test fails on the bare form.
- Teacher hours come from `getWorkloadByTeacher` / `getTeacherMetrics` (`src/lib/teacher-utils.ts`). Do not re-sum `teacher_classes` by hand: it has no foreign keys, and orphaned rows must not count.
- A dock item's `match` prefixes must be linked from its section tabs (`src/lib/navigation.ts`); the test enforces it.
- Client components cannot receive functions or component types from a server page (e.g. icons): pass data or rendered elements.
- Hardcoded lilac (`#6b7cf7`) and greys in old pages are the interim look, not the system. Replace them when you touch a page.
- `.impeccable/` holds design mocks and their scripts. It is not app code and is excluded from lint.
