# Design handover: teacher home

Last update: 2026-10-27. For: the next agent or designer who continues EduPlan's design work. You need no other context than this file and the files it links.

## 1. Status in one minute

| | |
|---|---|
| **Done** | The information architecture and UX of the teacher home are approved. Studio structure (D6). Round 1 verdict: keep A, F, G (D29). Round 2: **H Mono verre** (light inset) and **I Mono sombre** (dark inset, D31). Slop detector `[]` on the built directions |
| **Live mocks** | Same DOM for variants: `.impeccable/mocks/teacher-home/variants/`. Compare round 1 in `variantes.html`, round 2 in `variantes-round2.html`. Legacy structure picks: `index.html` (studio, lagune, feuille) |
| **Picked (2026-10-26)** | Structure 1, **Studio**. Brief: `.impeccable/surfaces/src-app-dashboard-teacher-page-tsx.md` |
| **Teacher needs (section 7)** | Interview done 2026-10-26. Results: `MVP_REWORK_PLAN.md` sections 3, 5, 6, 9 (D6 to D14) |
| **Next** | Pick H (light) or I (dark), or a named mix, and lock tokens in section 4. Then phone register in the winner. No new mock screens beyond variants (D26) |
| **Not done** | No application code changed for the new design. Variant assets may still be uncommitted on the branch |

## 2. Read first

1. `PRODUCT.md`: users, purpose, principles, design direction.
2. `project_docs/MVP_REWORK_PLAN.md`: MVP scope, information architecture per role (section 5), flows (section 6), order of work (section 8).
3. `project_docs/REFERENCES.md`: every site and image we used, with what each one is for.
4. This file, sections 3 to 6.

Do not use `src/app/globals.css` as a reference. It holds the old look (lilac `#6b7cf7`, Plus Jakarta Sans), which is being replaced.

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

Every live mock carries these tokens in its `:root`.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#f6f4fc` | Page ground, "lavender mist". Navigation sits directly on it |
| `--sheet` | `#ffffff` | Cards and modules |
| `--ink` / `--ink-2` / `--ink-3` | `#24212f` / `#55516a` / `#6c687d` | Text. `--ink` is also the primary button |
| `--lav` / `--lav-ink` / `--lav-t` / `--lav-tt` | `#8f7ff0` / `#5a47c7` / `#eeebfd` / `#f7f6fe` | Progress, selection, links, active navigation |
| `--coral` / `--coral-ink` / `--coral-t` | `#f2765f` / `#b8432f` / `#fdeae6` | "Now" and attention: live course, absences, late work |
| `--line` | `#efedf6` | Dividers inside lists only |

Rules:

1. Font: **Ranade** (Fontshare), weights 400/500/700, everywhere. Headings 500 with -0.02em tracking. Tabular figures for numbers.
2. Cards: white, radius 28 (blocks inside: 20), **no border, no shadow**.
3. Controls are capsules (search, buttons, segmented controls).
4. Primary action: ink capsule. On phones it carries the only shadow on screen (`0 10px 20px -10px rgba(36,33,47,.55)`).
5. Text on coloured fills uses the matching `-ink` colour, never grey. Never white text on `--coral` or `--lav` (contrast fails).
6. Work to grade: Superlist-style round checkboxes. Digital work shows previews of student answers (name + one line, 12 px minimum). Paper work shows none.
7. Not used: icon badges in tiles, chip rows, borders around rows, gradients, 3D icons (only if an illustrator draws them later).

### Round 2 candidate H (Mono verre, pending final pick)

Maps to [MonoCode](https://github.com/hardbeat920/monocode) `layout-inset` light: shell `#f5f5f5` class neutral HSL, panel `#fff`, strokes at 4% / 7% content mix, **system-ui** (not Ranade). EduPlan accents unchanged (D21). Source: `variants/mono.css`, mock `studio-mono-desktop.html`.

| Token | Value | Role |
|---|---|---|
| `--shell` | `hsl(240 4% 96%)` | Outer ground (MonoCode `--inset-surface` class) |
| `--panel` | `#ffffff` | Opaque workspace card |
| `--stroke-inset` | `color-mix(ink 4%)` | Card edge, controls, slots |
| `--line` | `color-mix(ink 7%)` | List dividers (MonoCode `--color-stroke`) |
| `--now` / `--prog` | coral / teal | Same meaning as baseline |

### Round 2 candidate I (Mono sombre, pending final pick)

Same geometry as H. MonoCode dark defaults (`:root`, not `.theme-light`): shell `#0d0d0d`, panel `#141414`, content at 92% lightness. Accent text is light (`--now-ink`, `--prog-ink`) so it stays readable on the dark panel. Source: `variants/sombre.css`, mock `studio-sombre-desktop.html`.

## 5. The live mocks

All in `.impeccable/mocks/teacher-home/`. Self-contained HTML, inline CSS, no JavaScript. Screenshots: `.impeccable/review/v5/`.

| # | Files | Structure | Signature | Phone (appel 3ème B) |
|---|---|---|---|---|
| 1 | `studio-desktop.html`, `studio-phone.html` | Labelled icon dock, module dashboard: 2 stats, grade-pace chart, today's courses, live course, work to grade | Grades entered vs the pace needed before the conseil | List with P / A / R per student |
| 2 | `lagune-desktop.html`, `lagune-phone.html` | Tree sidebar, live course first, work cards, class cards, calendar panel on the right | Seat plan (tables-bancs) in the live course card | Tap a seat to mark absent, twice for late |
| 3 | `feuille-desktop.html`, `feuille-phone.html` | Tree sidebar, the day as accordions, side panel for grading and the conseil | Register open inside the live course | Accordions with présence switches |

Demo data (illustrative, keep consistent): teacher Aïssatou Diop, Mathématiques, École Internationale de Dakar, Monday 26 October 2026, trimestre 1 week 8 of 12, conseil on 11 December. 3ème B has 31 students on every screen. Do not invent metrics or claims.

Other files in that folder are history: `toddle-*` (round 3), `atelier-*`, `ephemeride-*`, `cartable-*`, `carnet-vivant-*`, `plate-*` (round 2). Do not present them.

### How to check a mock

```bash
# render (desktop 1440x900, phone 390x844)
H=~/Library/Caches/ms-playwright/chromium_headless_shell-1194/chrome-mac/headless_shell
$H --headless --hide-scrollbars --virtual-time-budget=10000 --window-size=1440,900 \
  --screenshot=.impeccable/review/v5/studio-desktop.png file://$PWD/.impeccable/mocks/teacher-home/studio-desktop.html

# slop and accessibility detector (expect [])
~/.claude/skills/impeccable/scripts/impeccable detect --json .impeccable/mocks/teacher-home/{studio,lagune,feuille}-{desktop,phone}.html
```

Current state: the detector returns 0 findings on all 6 files. One recorded suppression in `.impeccable/config.json`: `nested-cards` on `studio-desktop.html` (a false positive from an earlier chart tooltip).

## 6. Lessons from 8 rounds (avoid repeating them)

1. **Structure was right early; the look was the problem.** From round 3 on, the user approved the IA. Every rejection after that was about visual language. Do not reopen the structure without a reason.
2. **"Generic shadcn site" comes from defaults.** Inter, DM Sans, Outfit, Manrope, a dark rail, icon tiles and bordered cards all read as generic to this user.
3. **Soft means fewer things, not softer things.** Rounds 5 and 6 added rounded badges, shadows and saturated violet and still failed. Round 7 passed by removing borders, shadows, badges and chips, and by holding to one font and two accent colours.
4. **Colour must mean something.** Coral = now / attention. Lavender = progress / selection. When coral appeared on grade bars, it read as an alarm.
5. **Check the data, not only the pixels.** Earlier rounds had ticked checkboxes on unfinished work, a chart axis mixing weeks and classes, and counts that did not add up to 31.
6. **Check by screenshot after every batch.** Text wrapping, unreadable 7.5 px previews and faint seat plans were only visible in renders.

## 7. Next phase: what a teacher really needs

The user wants to optimise the screens for real teacher work. Not started. Before designing, answer these with the user (interview, one round):

1. **Suivi de programme (curriculum progress)**, per subject and per class: what is the unit of progress (chapter, notion, competence, page of the official programme)? Who sets the programme (ministry, school, teacher)? Should it link to the cahier de textes entries?
2. **Suivi d'élèves (student follow-up)**: which signals matter (grades trend, absences, missing work, behaviour, remarks)? Who else sees it (professeur principal, parents, admin)? Where does an "élève à suivre" alert come from?
3. **Other daily needs** to confirm: cahier de textes, conseil de classe preparation (appréciations), communication with families, replacements.
4. **Where they live**: the teacher home (summaries), the class space (detail), or new pages.

Output of that phase: an updated `MVP_REWORK_PLAN.md` (scope and IA), then mocks in the approved visual language.

## 8. Definition of done for the current step

1. The user picks a structure (1, 2, 3, or a named mix).
2. Write a surface brief with the direction contract: `~/.claude/skills/impeccable/scripts/impeccable surface-brief write src/app/dashboard/teacher/page.tsx <body-file>`.
3. Add one line to `MVP_REWORK_PLAN.md` section 8, step 1: chosen structure, token table location (this file, section 4), mock paths.
4. Commit the design work on a branch (see `AGENT_WORKFLOW_PLAN.md`).

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
