# EduPlan decisions

Last update: 2026-10-28. One log for every accepted decision about the app. Each ID is stable. To change a decision, add a new row that says which ID it replaces. Do not edit the old row.

Context: `PRODUCT.md` (who and why), `MVP_REWORK_PLAN.md` (scope, IA, flows, order of work), `DESIGN_HANDOVER_TEACHER_HOME.md` (visual language and mocks).

## Product and data

| ID | Topic | Decision | Date |
|---|---|---|---|
| D1 | Grade scale | /20 with coefficients and trimestres (French system) | 10-25 |
| D2 | Digest channel | Email first, WhatsApp later | 10-25 |
| D3 | File storage for submissions | S3-compatible storage (Cloudflare R2) | 10-25 |
| D4 | Database at scale | Keep libSQL and host it on Turso, or move to Postgres before the first school goes live | 10-25 |
| D5 | Rubrics | /20 only in the MVP. Rubrics come first after the MVP | 10-25 |
| D15 | Class news feed (stream) | Out of the MVP | 10-25 |
| D16 | UI language | French, with the French class ladder and school terms (trimestre, conseil de classe, cahier de textes, appréciations) | 10-25 |

## Teacher needs (interview 2026-10-26)

| ID | Topic | Decision | Date |
|---|---|---|---|
| D7 | Unit of programme progress | Chapitre split into notions | 10-26 |
| D8 | Who sets the programme | The school loads it; the teacher reorders it and plans a week for each chapter, per class | 10-26 |
| D9 | Programme and cahier de textes | The entry suggests the notion; the teacher confirms | 10-26 |
| D10 | Student signals | Grades trend, absences and retards, missing work, remarks | 10-26 |
| D11 | "Élève à suivre" source | School rules first; the teacher can add or dismiss a flag | 10-26 |
| D12 | Remark visibility | Private by default (teacher, professeur principal, admin). The teacher switches one remark to "visible famille" | 10-26 |
| D13 | Programme pace display | Bar on the home (notions vs weeks), planned weeks in the class Programme tab | 10-26 |
| D14 | Family contact | One thread per student between the teacher and the parents | 10-26 |
| D17 | Who sees student follow-up | Professeur principal (all subjects of the class), admin / vie scolaire, parents and student (without private remarks) | 10-26 |
| D18 | Teacher MVP scope | In: cahier de textes, conseil preparation (appréciations), family thread. Out: remplacements | 10-26 |
| D19 | Placement | Summaries on the teacher home, details in the class space (new Programme tab, Élèves tab with the signals) | 10-26 |

## Design

| ID | Topic | Decision | Date |
|---|---|---|---|
| D6 | Teacher home structure | Studio: labelled icon dock and a module dashboard | 10-26 |
| D20 | Direction | Soft, approachable minimalism. Feel references: Superlist, Toddle, Craft, Notion Calendar, Lemon Squeezy, Headspace | 10-26 |
| D21 | Accents | Mark functions, not subjects. "Now / attention" and "progress / selection" each get one accent. The UI looks right with no subject colour | 10-26 |
| D22 | Device | Attendance is phone first. Grading is laptop first | 10-26 |
| D23 | Icons | Always with a text label | 10-26 |
| D24 | Primary action | One per screen. On phones it is the only raised element | 10-26 |
| D25 | Baseline visual language | Lavender mist + coral, Ranade, white cards with no border and no shadow (tokens: handover section 4). This baseline is "solid", not final (see D27) | 10-26 |
| D26 | Role of mocks | Mocks show what the app looks like. They are not a spec to complete screen by screen. Stop extending them; the class tabs are designed in code | 10-26 |
| D27 | Next design step | Make new versions of Studio in the soft UI direction. Change only tokens, tone and visual cues; keep the structure and the content. Plan: `STUDIO_VARIANTS_PLAN.md` | 10-26 |
| D28 | Next design step (replaces D27) | The variants are soft UI sub-directions, not colour themes (flat pastel, tonal, bento, neumorphism, clay, glass, editorial). Each one restyles the same Studio DOM: surface, depth, shape, colour logic, type, data drawing, cues. The modules, their order and the content stay fixed. Plan: `STUDIO_VARIANTS_PLAN.md` | 10-26 |
| D29 | Round 1 verdict | Keep A (plat pastel), F (verre dépoli), G (éditorial). Drop B, C, D | 10-27 |
| D30 | Round 2 blends | **H · Mono verre** — F × [MonoCode](https://github.com/hardbeat920/monocode): neutral shell, inset workspace glass, hairline strokes, system UI. **I · Folio** — A × G: white cards on lavender mist with editorial type and section rules. Compare: `.impeccable/mocks/teacher-home/variantes-round2.html` | 10-27 |
| D31 | Round 2 second slot (replaces the Folio half of D30) | **I · Mono sombre** replaces Folio. Same inset shell as H, MonoCode dark: shell `#0d0d0d`, panel `#141414`, light ink, same two accents. Compare: `variantes-round2.html` | 10-27 |
| D32 | Visual language (replaces D25 and D26) | **A+ · Plat vif** is the language for the app (`variants/plat.css` + `variants/vif.css`). Mock the other screens in it: class space (Programme, Élèves), grading, phone register. Shared stylesheet for new screens: `.impeccable/mocks/teacher/src/app.css`. Gallery: `.impeccable/mocks/teacher/index.html` | 10-27 |
| D33 | Typeface (replaces Ranade in D25) | **Poppins**, picked on `/design-system` against Ranade, Chillax, Instrument Sans, PT Sans and Google Sans. One family in two roles: `font-display` (titles, big numbers, class names: 500, tracking -0.025em) and `font-sans`. Self-hosted with `next/font/google` (SIL OFL) | 10-27 |
| D34 | "Élève à suivre" thresholds (answers open question 1) | Defaults per school, per subject and per trimestre: average below **10/20**, **3** unjustified absences or more, **2** missing works or more. The admin can change each value or switch a rule off in Réglages | 10-27 |
| D35 | Who loads the programme (answers open question 2) | The **admin** loads it for each subject and level. No new role | 10-27 |
| D36 | Who sees flags (answers open question 3) | Teacher, professeur principal and admin always. Students and parents only if the admin turns it on in Réglages (one switch each, off by default) | 10-27 |
| D37 | Appréciation générale (answers open question 4) | **Yes in the MVP.** The professeur principal writes one appréciation générale per student per trimestre, next to the subject appréciations | 10-27 |
| D38 | Class space identity | The class space is **class + subject** (`/dashboard/teacher/classes/[classId]/[subjectId]/…`). Programme plans, coverage, and timetable room/topic belong to that pair. Clock time uses `schools.time_zone` (default `Africa/Dakar`) | 10-27 |
| D39 | Duplicate protection | One submission per school/post/student; one attendance row per school/timetable/date/student; one grade per linked submission; one subject or general appreciation per school/student/term. Standalone grades remain repeatable. Migration must not delete conflicting rows automatically | 10-27 |
| D40 | Annual class lifecycle | One class row per academic year. "6ème A" next year is a new row; a row is never moved to another year. `classes.academic_year_id` links the row to `academic_years` (foreign key). Year rollover copies classes | 10-28 |
| D41 | Year and term context | The term lives in the URL (`?term=<id>`), checked against the school on the server. Default: the term that contains today, else the last finished term, else the first. A term is editable until the admin closes it (`terms.closed_at`); past years are read-only | 10-28 |
| D42 | Grade identity | `classes.grade_code` from the fixed national ladder (CI … CM2, 6e … 3e, 2nde, 1re, Tle). Programmes are keyed by school + subject + grade. Never parse the class name. Lycée series (L, S) is a later optional column | 10-28 |
| D43 | Automatic flags | D34 rules are calculated in SQL when the screen loads, per class, subject and term. Only manual flags and dismissals are stored. A dismissal holds for that student, rule, subject and term | 10-28 |
| D44 | Attendance saves | Online first: each change is an upsert on the unique key, with saving / saved / failed states. No offline queue in the MVP. Lesson dates come from the timetable plus an exceptions table (holidays, cancellations). Register completion is its own row | 10-28 |
| D45 | Multi-school identity | One login identity with school memberships (school + role). Required before a second school is onboarded, not before a one-school pilot | 10-28 |

## Open

Product safety gates are tracked in `SCALABILITY_AND_USABILITY.md`. D40–D45 answer the open product questions. Implemented so far: D40 (year link) and D41 (resolver and term closing column), branch `feat/academic-context`. D42–D45 are accepted but not built.
