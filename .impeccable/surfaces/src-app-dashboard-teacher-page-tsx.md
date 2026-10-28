---
version: 1
slug: "src-app-dashboard-teacher-page-tsx"
primary_target: "src/app/dashboard/teacher/page.tsx"
related_targets: []
---

Scope: teacher home (/dashboard/teacher). Mode: Operate. This surface serves the teacher; every role is first-class in the product.

Task: answer "what do I do now?" in one step: open today's register, grade waiting work, see pace before the conseil. UI language: French.

User pick (2026-10-26): structure 1, Studio. Mocks: `.impeccable/mocks/teacher-home/studio-desktop.html`, `studio-phone.html`. Tokens: `project_docs/DESIGN_HANDOVER_TEACHER_HOME.md` section 4.

Teacher-needs interview (2026-10-26) adds two home modules before code: "Programme" (notions covered vs weeks passed, one bar per class) and "Élèves à suivre" (rule flags plus teacher pins). Detail lives in the class space. See `project_docs/MVP_REWORK_PLAN.md` sections 3 and 5.

## Direction contract

THESIS: A calm module dashboard for one teacher's day, minimal soft UI. It refuses the dense admin table and the generic shadcn card grid.

OWN-WORLD: Lavender-mist ground #f6f4fc with navigation directly on it; white sheets, radius 28 (inner blocks 20), no border, no shadow. Ink #24212f for text and the primary button. Lavender #8f7ff0 for progress, selection, active navigation. Coral #f2765f for now and attention only. Ranade 400/500/700 everywhere, tabular figures.

STORY: The teacher sees the live course and opens its register, sees copies to grade with previews of student answers, sees grade pace and programme pace against the conseil date, and sees which students need attention.

FIRST VIEWPORT: Labelled icon dock (Accueil, Classes, Notes, Présences, Agenda). Greeting with date and trimestre week. Two stats (notes saisies pour le conseil, copies à corriger), the grade-pace chart to the conseil, today's courses, the live course card with "Faire l'appel" as the one ink capsule, the "À corriger" list with round checkboxes.

FORM: Studio, round 8. Raises: one primary action per screen, labelled icons, previews of student work for digital submissions only, colour that means a function.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
