@AGENTS.md

# EduPlan

School platform for francophone schools (Senegal first). Product: `PRODUCT.md`. Scope and order of work: `project_docs/MVP_REWORK_PLAN.md`. Every accepted decision: `project_docs/DECISIONS.md` (cite the ID, e.g. D32). App build plan: `project_docs/APP_BUILD_PLAN.md`.

## Commands (Bun only)

- `bun run dev`: dev server
- `bunx tsc --noEmit`: typecheck. `bun run lint`: lint. `bun test`: tests (`bun test path/to/file.test.ts` for one)
- `bun run build`: production build (runs tsc first)
- Done means: tsc, lint (0 errors) and tests pass; UI changes are checked by screenshot against the mock

## Design system

- Visual language: A+ Plat vif (D32). Tokens and rules: `src/app/globals.css` (read its header comment). Components: `src/components/ui/`. Live preview: `/design-system` (dev only).
- Reference mocks to match: `.impeccable/mocks/teacher/` (gallery `index.html`) and `.impeccable/mocks/teacher-home/studio-vif-desktop.html`.
- Use tokens (`text-now-ink`, `bg-progress-soft`, `shadow-lift`, `fill-progress`...), never raw hex in components.
- Type: Poppins (D33), in two roles: `font-display` (page and card titles, big numbers, class names) and `font-sans` (everything else). Format class names with `classLabel()` and French punctuation with `frSpaces()` from `src/lib/fr.ts`.
- UI copy is French. Grades are /20 with coefficients and trimestres.

## Gotchas

- The admin pages fetch in `useEffect` and set state (30 lint warnings). Do not copy this pattern: new pages are server components that read through `src/lib`.
- `@radix-ui/react-slot` is pinned to ^1.5 through `overrides`: older copies render nothing for lazy server children inside `asChild`.
- Public routes live in `src/lib/public-routes.ts` (tested). Every other route needs a session.
- Hardcoded lilac (`#6b7cf7`) and greys in old pages are the interim look, not the system. Replace them when you touch a page.
- `.impeccable/` holds design mocks and their scripts. It is not app code and is excluded from lint.
