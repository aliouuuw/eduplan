# Design handover: teacher home

> **Current engineering handover (2026-10-27):** Read `HANDOVER_DATA_SAFETY.md` before continuing app work. It records the uncommitted data fixes, passing checks, invitation UI blocker, remaining product gates, and a continuation prompt. This document remains the design reference, not the engineering status log.

> **History.** This document records the design exploration that led to A+ Plat vif (D32) and Poppins (D33). The mock files and renders it lists were removed in the cleanup of 2026-10-27; they remain in git history. Current references: `DECISIONS.md` (D32, D33), `.impeccable/mocks/teacher/` and `.impeccable/mocks/teacher-home/studio-vif-desktop.html`.

Last update: 2026-10-27. For: the next agent or designer who continues EduPlan's design work. You need no other context than this file and the files it links.

## 1. Status in one minute

| | |
|---|---|
| **Done** | Studio structure (D6). Teacher-needs interview (D7–D19). Visual language **A+ Plat vif** (D32) and **Poppins** (D33). Product open questions answered (D34–D37). Exploration mocks removed 2026-10-27; history in git |
| **Live mocks** | Teacher home: `.impeccable/mocks/teacher-home/studio-vif-desktop.html` (build: `variants/build.ts`). Other teacher screens: `.impeccable/mocks/teacher/index.html` + `src/app.css` |
| **Picked** | Structure **Studio**. Language **A+ Plat vif**. Brief: `.impeccable/surfaces/src-app-dashboard-teacher-page-tsx.md` |
| **Tokens in code** | `src/app/globals.css` (header comment). Preview: `/design-system` (dev) |
| **Next** | Continue the current slice in `HANDOVER_DATA_SAFETY.md`; the shell and teacher home already exist. Match the approved language; do not reopen variant compare pages |
| **Not done** | Remaining class tabs, grading, attendance, and legacy admin page rebuilds; see `APP_BUILD_PLAN.md` |

## 2. Read first

1. `PRODUCT.md`: users, purpose, principles, design direction.
2. `project_docs/MVP_REWORK_PLAN.md`: MVP scope, information architecture per role (section 5), flows (section 6), order of work (section 8).
3. `project_docs/REFERENCES.md`: every site and image we used, with what each one is for.
4. This file, sections 3 to 6.

Use `src/app/globals.css` and its header comment as the current token reference (D32/D33). The hardcoded lilac in untouched legacy pages is not the design system.

## 3. Decisions (do not re-ask)

Full log with IDs: `DECISIONS.md`. The table below is the design subset.

### Brief (the user's words, condensed)

"Warm, student-centered educational workspace": a calm, approachable SaaS interface. Soft neutral backgrounds, restrained accents, rounded cards, clear type, persistent sidebar, modular content. Lessons, work, assessments and progress as distinct content blocks. Guided workflows, contextual actions, progressive disclosure. Avoid dense admin tables, decoration, childish illustration, generic corporate dashboards.

Toddle in one line: "a collaborative educational workspace with a soft, editorial SaaS aesthetic". Combine it with the precision of modern productivity tools. Feel references, in order of weight: **Superlist**, Toddle, Craft, Notion Calendar, Lemon Squeezy, Headspace (links in `REFERENCES.md`).

### Product and UX decisions

| Topic | Decision |
|---|---|
| Accents | Mark **functions**, not subjects. Subjects are set by each school; an admin may give a subject an optional colour or icon later. The UI must look right with no subject colour |
| Device | Attendance is phone first (taken in class). Grading is mostly on a laptop |
| Language | French. French school system: /20 with coefficients, trimestres, conseil de classe, cahier de textes, appréciations |
| Out of MVP | Class news feed (stream) |
| Icons | Always with a text label (Airbnb lesson, round 8) |
| Primary action | One per screen. On phones it is the only raised element |

## 4. The approved visual language (source of truth for code)

**D32 · A+ Plat vif** on top of plat pastel (round 8). Canonical CSS: `variants/plat.css` + `variants/vif.css`. App tokens: `src/app/globals.css`.

| Token | Value | Role |
|---|---|---|
| Ground | `#f3f1fb` + soft diagonal mist gradient | Page background (not flat grey) |
| `--sheet` / cards | `#ffffff` | Modules; inset top lip + `--lift` shadow |
| `--ink` / `--ink-2` / `--ink-3` | `#24212f` / `#55516a` / `#6c687d` | Text. `--ink` is also the primary button |
| `--prog` / `--prog-ink` / `--prog-t` | `#8f7ff0` / `#5a47c7` / `#eeebfd` | Progress, selection, links, active nav |
| `--now` / `--now-ink` / `--now-t` | `#f2765f` / `#b8432f` / `#fdeae6` | Live course, absences, late work |
| `--line` | `#efedf6` | List dividers only |

Rules (see also `globals.css` header):

1. Font: **Poppins** (D33). `font-display` for titles and big numbers (500, -0.025em). `font-sans` for everything else.
2. Gradients only on progress fills, the live course, and the one primary action. No decorative blobs.
3. Glows are tinted, offset shadows (`--lift`, `--shadow-glow-*`), never zero-offset halos.
4. Controls stay capsules. One primary action per screen; on phones it is the only raised element.
5. Text on tinted fills uses `-ink` variants. Never white on coral or lavender fills.
6. Work to grade: round checkboxes; digital work shows a name + one line preview (12 px min).

Variant exploration (A–K, MonoCode, glass fonds) is archived in git history and `STUDIO_VARIANTS_PLAN.md`. Do not rebuild compare pages unless the product reopens that question.

## 5. The live mocks

| Area | Path | Build |
|---|---|---|
| Teacher home (Studio + suivi modules) | `teacher-home/studio-vif-desktop.html` | `cd variants && bun build.ts` |
| Class tabs, grading, phone register | `teacher/index.html` (gallery) | `teacher/src/build.ts` |

Demo data (keep consistent): Aïssatou Diop, Mathématiques, École Internationale de Dakar, Monday 26 October 2026, trimestre 1 week 8 of 12, conseil 11 December. 3ème B = 31 students.

### How to check a mock

```bash
cd .impeccable/mocks/teacher-home/variants && bun build.ts && ./render.sh
# expect detector JSON: []
# screenshot: .impeccable/review/vif.png
```

## 6. Lessons from 8 rounds (avoid repeating them)

1. **Structure was right early; the look was the problem.** From round 3 on, the user approved the IA. Every rejection after that was about visual language. Do not reopen the structure without a reason.
2. **"Generic shadcn site" comes from defaults.** Inter, DM Sans, Outfit, Manrope, a dark rail, icon tiles and bordered cards all read as generic to this user.
3. **Soft means fewer things, not softer things.** Rounds 5 and 6 added rounded badges, shadows and saturated violet and still failed. Round 7 passed by removing borders, shadows, badges and chips, and by holding to one font and two accent colours.
4. **Colour must mean something.** Coral = now / attention. Lavender = progress / selection. When coral appeared on grade bars, it read as an alarm.
5. **Check the data, not only the pixels.** Earlier rounds had ticked checkboxes on unfinished work, a chart axis mixing weeks and classes, and counts that did not add up to 31.
6. **Check by screenshot after every batch.** Text wrapping, unreadable 7.5 px previews and faint seat plans were only visible in renders.

## 7. Teacher needs (done)

Interview 2026-10-26. Logged in `DECISIONS.md` (D7–D19, D34–D37) and `MVP_REWORK_PLAN.md` sections 3, 5, 6.

## 8. Definition of done for design step 1

1. Structure **Studio** and language **A+ Plat vif** recorded (D6, D32, D33).
2. Reference mocks listed in section 5; exploration assets removed from the tree.
3. Tokens live in `src/app/globals.css` and `/design-system`.
4. Next work is MVP step 2 in code (`APP_BUILD_PLAN.md`).

## 9. History (short)

| Round | Date | What happened | Verdict |
|---|---|---|---|
| 1 | 10-25 | 4 directions via the impeccable roll (Bulletin, Carnet de correspondance, Tableau du jour, Google Classroom standard) | Rejected: same skeleton, dark rails, no warmth |
| 2 | 10-25 | 5 new directions (Atelier, Éphéméride, Cartable, Carnet vivant, Plate) | Rejected: "any other shadcn website" |
| 3 | 10-26 | 3 Toddle-aligned directions from the user's screenshots | IA approved, look not |
| 4 | 10-26 | De-slopped rebuild: Studio, Lagune, Feuille de route; Fontshare faces | Look not there |
| 5 | 10-26 | Soft UI shapes from LearnUp and course-outline references | Look not there |
| 6 | 10-26 | LearnUp lavender/violet colours on all 3 | Look not there |
| 7 | 10-26 | One minimal soft UI language, coral + lavender, Ranade, no borders or shadows | "Getting solid" |
| 8 | 10-26 | Airbnb lessons: labelled icons, one raised action, previews of student work | Current |
