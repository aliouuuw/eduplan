# Studio variants: plan

> **History.** This document records the design exploration that led to A+ Plat vif (D32) and Poppins (D33). The mock files and renders it lists were removed in the cleanup of 2026-10-27; they remain in git history. Current references: `DECISIONS.md` (D32, D33), `.impeccable/mocks/teacher/` and `.impeccable/mocks/teacher-home/studio-vif-desktop.html`.

Status: **closed.** Pick **A+ Plat vif** (D32). Compare pages and per-direction CSS removed 2026-10-27; see git history. Decisions: D28–D33 in `DECISIONS.md`.

## 1. Goal

Soft UI is a family of styles, not one style. On Dribbble and similar sites, "soft" is built in different ways: flat pastel, tonal containers, neumorphism, clay, frosted glass, soft bento, soft editorial. Each one makes the interface feel gentle for a different reason.

Goal: make the same Studio teacher home in several of these sub-directions. Then compare them side by side and pick one, or a named mix. The question is "which kind of softness is EduPlan?". A palette swap does not answer that question.

## 2. Fixed in every variant

| Item | Why |
|---|---|
| The modules and their reading order (`studio-suivi-desktop.html`) | D6. The IA is approved |
| The content and the demo data (Aïssatou Diop, 3ème B with 31 students, week 8 of 12, conseil on 11 December) | The comparison shows the style only |
| French copy | D16 |
| One primary action per screen | D24 |
| Icons with a text label | D23 |
| Two accent meanings: "now / attention" and "progress / selection" | D21. Each direction picks its own hues |
| WCAG AA text contrast (4.5:1 body, 3:1 large text and UI parts) | Accessibility |
| Slop detector returns `[]` | Same bar as rounds 7 and 8 |

## 3. What a direction changes

A direction is a full stylesheet over the same HTML. It may change all of these:

| Layer | Examples of what changes |
|---|---|
| Surface model | Cards on a ground, tinted containers, one continuous surface, translucent panels, no containers |
| Depth model | None, tonal steps, dual light/dark shadows, inner highlights, blur |
| Shape language | Radius, control shapes, tile proportions, bento spans |
| Colour logic | Where colour sits: in the accents only, filling whole modules, or behind glass |
| Type voice | Weight, scale contrast, and one display face if the direction needs it |
| Data drawing | Dots, bars, rings, big numbers, sparklines |
| Cues | How "now", "selected", "to do" and "done" look; icon style; active nav |
| Geometry | Module sizes and spans may change. Module order may not |

## 4. Catalogue of soft UI sub-directions

| # | Direction | How the softness is made | Fit with the brief | Risk |
|---|---|---|---|---|
| A | **Plat pastel** (baseline, round 8) | White borderless cards on a tinted ground, two accents, capsules | Superlist, Notion Calendar | Can feel empty; already seen |
| B | **Tonal** (Material You family) | No white cards: each module is a container tinted from one seed colour. Hierarchy comes from tone steps. Large radii, filled tonal buttons | Headspace, Toddle | Colour fills can blur the accent meanings (D21) |
| C | **Bento doux** | Modules become tiles of different sizes in a tight grid. Each tile has one big number or one drawing. Some tiles have pastel fills, most are white | Lemon Squeezy, Craft | Turns into a KPI wall; needs real content per tile |
| D | **Néomorphisme léger** | One continuous surface colour. Modules are raised with a light shadow top-left and a dark shadow bottom-right. Selected items look pressed in | The classic "soft UI" | Low contrast and accessibility. Earlier rounds failed with shadows (handover lesson 3) |
| E | **Argile** (claymorphism, restrained) | Puffy elements: thick radius, an inner top highlight, an inner bottom shade, a soft tinted drop. Controls feel touchable | Headspace, warm and friendly | Reads as childish (brief: "avoid childish") |
| F | **Verre dépoli** | Translucent white panels with blur over a soft painted colour field with grain. Bright edge highlight on each panel | Premium, calm | Botched glass, background blobs (slop law) |
| G | **Éditorial doux** | Almost no containers. Paper-white ground, hierarchy from type and space, a display face for headings, soft dividers | Craft, Notion | Can drift away from "soft" into "document" |

Not in the catalogue: soft dark mode (out of scope for round 1), aurora gradients and blobs (slop).

## 5. Round 1 (picked 2026-10-26)

Six files: the baseline plus 5 directions. Argile (E) is dropped.

| File | Direction |
|---|---|
| `studio-plat-desktop.html` | A Plat pastel (baseline) |
| `studio-tonal-desktop.html` | B Tonal |
| `studio-bento-desktop.html` | C Bento doux |
| `studio-neo-desktop.html` | D Néomorphisme léger |
| `studio-verre-desktop.html` | F Verre dépoli |
| `studio-edito-desktop.html` | G Éditorial doux |

## 6. Mechanics (built 2026-10-26)

All in `.impeccable/mocks/teacher-home/variants/`.

| File | Role |
|---|---|
| `base.html` | The one DOM. Semantic classes, inline SVG drawn with `currentColor` and classes |
| `structure.css` | Shared reset, layout and inner arrangement of each module. No colour, no depth |
| `<id>.css` | One direction: tokens, surface, depth, shape, cues. It may change geometry (bento uses `display: contents` on the columns) |
| `build.ts` | `bun build.ts` writes `../studio-<id>-desktop.html` for each CSS file present, and `../variantes.html` (compare page) |
| `render.sh` | Renders each direction to `.impeccable/review/v7/<id>.png` (1440 × 1600) and runs the detector from the project root, so `.impeccable/config.json` applies |

The detector already checks WCAG AA contrast, so there is no separate contrast script.

A DOM change goes into `base.html` for all directions.

## 7. Round loop

1. Build the 6 files and the compare page.
2. Run the checks. Fix until the detector returns `[]` and every pair passes AA.
3. Show the compare page. The user marks each direction: keep, drop, or "take X from it".
4. Round 2: 2 variants. **2026-10-27:** `mono.css` (light inset) and `sombre.css` (dark inset). Folio is removed (D31). `bun build.ts` writes `variantes-round2.html`.
5. Fond test (not a pick), v2 on 2026-10-27: F with a stronger glass recipe over three scenes. Compare: `variantes-fonds.html`.
   - Glass recipe: `variants/glass.css`, layered on `verre.css`. Panels use a 68 to 82% white tint (v1 used 90%, which read as white cards), `backdrop-filter` brightness, a specular sheen, a light-catching edge, frosted inner blocks, a floating glass dock, and a scene window above the modules.
   - J Soie and K Dunes: authored renders at 2× (2880 × 3200) from `variants/render_fields.py`. They replace v1's muddy `brume.jpg`.
   - L Jardin: `backgrounds/nature.jpg` (1280 × 720) used as a top band that fades over 10 eased stops into a dusk-green tone sampled from its foliage. Ceiling: a production version needs a source at least 2880 px wide.
   - `soie.css`, `dunes.css` and `jardin.css` are generated on each build.
6. Record the pick in `DECISIONS.md` as a new row that replaces D25. Write the final tokens into handover section 4 with role names (`--now`, `--progress`). Build the phone register screen in the winner as the last check.

## 8. Done when

1. One direction is picked and recorded.
2. Handover section 4 holds its tokens and its rules (surface, depth, shape, cues).
3. Desktop and phone renders of the winner pass the detector and the contrast check.
4. The tokens and rules are ready for `src/app/globals.css` (Tailwind v4 `@theme`) in MVP step 2.

## 9. Estimate

| Step | Time |
|---|---|
| Semantic `base.html`, reset, build script, compare page | 1 hour |
| 6 directions (about 40 minutes each), renders and fixes | 4 hours |
| Each later round | 1 to 2 hours |

Round 1: about 5 hours.

## 10. Questions before the build

Defaults apply if there is no answer.

1. Round 1 directions: answered, A B C D F G.
2. May a direction use its own display face (for example G or E)? Default: Ranade everywhere in round 1, so only the style changes.
3. Should round 1 include the phone register screen? Default: no. Desktop only; the phone is built for the winner.

## 11. A+ · Plat vif (2026-10-27)

An enhanced A in the same world. File: `variants/vif.css`, layered on `plat.css` (`extends` in `build.ts`). Compare: `variantes-plat.html`.

1. Gradients only where they carry meaning: progress fills (lavender), the live course and its track (coral), the primary action (ink).
2. Glows are tinted and offset under the elements that matter: the active nav item, "Faire l'appel", the class ahead of the programme. There is no zero-offset halo.
3. The ground is one directional light wash from the top right. There are no blobs.
4. One authored motion: progress fills settle on load with a `clip-path`. The final state is the default when motion does not run; reduced motion is honoured.
5. Bolder numerals (52 px) and greeting (38 px). Hover states are tonal, never a lift.

## 12. Other teacher screens in A+ (2026-10-27, D32)

All in `.impeccable/mocks/teacher/`. Gallery: `index.html`. Source pages and the shared stylesheet are in `src/`. Build with `bun src/build.ts`; it inlines `src/app.css` and the dock into each page.

| Screen | File | What it shows |
|---|---|---|
| Classe · Programme | `classe-programme.html` | Term frise (planned weeks, done, today), chapters and notions, the notion suggested by the cahier de textes, pace to the end of the term |
| Classe · Élèves | `classe-eleves.html` | The 31 students with average, change, absences, missing work, remarks; Khady Fall's panel with grades, remarks (privée / visible famille), appréciation |
| Correction | `correction.html` | Devoir maison n°3, 4ème A: the copies, Awa's answers beside the subject, the grade, the comment, "Rendre et passer à Lamine" |
| Appel · téléphone | `appel-phone.html` | 3ème B register: exceptions only, one raised action (D24) |

Demo data matches the home: 3ème B has 31 students (27 present, 2 absent, 1 late, 1 excused); Khady Fall's 8,5 comes from her four grades; DM n°3 has 22 of 28 handed in. Renders: `.impeccable/review/v8/`. The detector returns `[]` on all four. Two scoped suppressions (form fields read as nested cards) are recorded in `.impeccable/config.json`.
