# EduPlan MVP rework plan

Status: draft, 2026-10-25. Updated 2026-10-26 with the teacher-needs interview (programme, élèves, conseil, families). Replaces the timetable-first direction in the older `project_docs/` files.

## 1. Position

EduPlan is one platform for the teaching and learning work of a francophone school.

- **Teaching and learning areas** follow Toddle: planning, assessment, portfolios, reports, attendance, behaviour, communication.
- **Operations areas** follow Gibbon: admissions, finance, library, activities, staff, timetable building.
- **The daily loop** follows Google Classroom: the teacher posts work, the student submits it, the teacher grades it, and the parent sees the result.

The timetable is a base layer. It feeds attendance (one register per slot) and the class space. It is no longer the product.

## 2. Target module map (full product)

| Area | Source | Modules |
|---|---|---|
| Planning | Toddle | Programme map, units, lessons (cahier de textes), coverage |
| Assessment | Toddle | Assignments, gradebook (/20 with coefficients), rubrics, feedback |
| Portfolios | Toddle | Student evidence (photo, video, file), shared with families |
| Reports | Toddle | Bulletins trimestriels, appréciations, transcripts |
| Class operations | Toddle | Attendance per slot, shared calendar, workload |
| Behaviour and care | Toddle | Incidents, alerts, follow-up (vie scolaire) |
| Communication | Toddle | Announcements, messages, parent digest |
| Operations | Gibbon | Admissions, finance (fees), library, activities, staff, timetable building |

## 3. MVP scope

The Google Classroom "Stream" (class news feed) is out of the MVP.

### In the MVP

1. **Class space.** One page for each class and subject. It has a work list grouped by topic, with three post types: lesson (cahier de textes entry), material, assignment.
2. **Submission and grading.** Students submit text or files. Teachers grade on /20 or with a rubric, add a comment, and return the work. Grades go to a per-class gradebook with coefficients and terms (trimestres).
3. **Attendance per timetable slot.** The teacher opens the register from today's slot. The teacher marks present, absent, or late. Parents can submit a justification.
4. **Parent digest.** A weekly email for each child: missing work, upcoming due dates, new grades, absences.
5. **Role-based home.** Each of the 5 roles gets a home that answers the question "what do I do now?" (section 5).
6. **Suivi de programme.** The admin loads the programme (D35) for each subject and level as chapitres split into notions. The teacher reorders it and sets a planned week for each chapter, per class. A cahier de textes entry suggests the notion it covers. The teacher confirms "notion faite" and "chapitre terminé". Progress = notions covered vs weeks passed in the trimestre.
7. **Suivi d'élèves.** Per student, in the teacher's subject: grades trend, absences and retards, missing work, remarks. EduPlan flags "élève à suivre" from school rules (D34 defaults: average below 10/20, 3 unjustified absences, 2 missing works, per subject and trimestre; the admin can change or switch off each rule). The teacher can add a flag with a reason, or dismiss one. Students and parents see flags only if the admin allows it (D36).
8. **Remarques.** Short teacher notes on a student (bavardage, oubli de matériel, encouragement). Each remark is private by default (teacher, professeur principal, admin). The teacher can switch one to "visible famille" (parents and student).
9. **Préparation du conseil.** The teacher writes one appréciation per student per trimestre, with the student's average, absences, missing work and remarks visible while writing. The professeur principal also writes the appréciation générale (D37), with every subject's appréciation in view.
10. **Messages famille.** One thread per student between the teacher and the parents (email and in-app). Absence justifications show in the same place.

The MVP also keeps the current school structure, accounts, invitations, availability, and auto-scheduler.

### Out of the MVP (in order)

1. Bulletins (the printed document) built from the gradebook and the appréciations
2. Unit planning beyond chapitres and notions (objectives, resources per unit)
3. Portfolios
4. Behaviour incidents and sanctions (vie scolaire). Remarks are in the MVP
5. Remplacements
6. Messages beyond the teacher-parent thread, then AI drafts, then the Gibbon operations modules

## 4. Keep, change, start over

### Keep (logic and data)

- Auth, invitations, password resets (`src/lib/auth.ts`, `invitations.ts`, `password-resets.ts`)
- The 16 tables in `src/db/schema.ts`: schools, users, levels, classes, subjects, teacher links, availability, enrolments, parent links, time slots, timetables
- Auto-scheduler and availability logic (`auto-scheduler.ts`, `availability-utils.ts`, `teacher-calculations.ts`)
- Radix-based UI primitives in `src/components/ui/` (they are restyled, not replaced)

### Change

- **Timetable** moves from the center of the product to a setup step for admins and a read view for the other roles.
- **Admin home** today shows hard-coded placeholders. It changes to live data (section 5).
- **The UI copy** moves to French everywhere.

### Start over

- **Information architecture and navigation** (`dashboard-sidebar.tsx`, `dashboard-topbar.tsx`, the `/dashboard/<role>/...` route tree)
- **Admin setup** becomes a guided flow: année scolaire → niveaux → classes → matières → enseignants → emploi du temps. It replaces the 10 separate CRUD pages that the admin must find alone.
- **Visual design**: tokens, layout shell, all page designs (section 7)

### New data (tables to add)

| Table | Purpose |
|---|---|
| `academic_years`, `terms` | Année scolaire and trimestres. Grades and attendance belong to a term |
| `topics` | Groups the posts in a class space |
| `posts` | Lesson, material, or assignment. Fields: class, subject, author, type, due date, max grade |
| `attachments` | Files on posts and submissions. Needs object storage (decision D3) |
| `submissions` | One for each student and assignment. Status: assigned, submitted, late, returned |
| `grades` | Value /20, coefficient, term, comment. Linked to a submission, or entered alone for a written test |
| `rubrics`, `rubric_criteria`, `rubric_scores` | Reusable rubrics |
| `attendance_records` | One for each student and time-slot occurrence. Status, minutes late, justification |
| `notifications` | Source of the parent digest and in-app alerts |
| `programmes`, `chapters`, `notions` | Programme per subject and level, set by the school. Chapters are ordered; notions belong to a chapter |
| `class_chapter_plans` | Per class: chapter order, planned week, status (à venir, en cours, terminé) |
| `notion_coverage` | Notion done for a class, with the cahier de textes post that covered it (optional) |
| `remarks` | Student, author, subject, text, visibility (privé, visible famille) |
| `student_flags` | Student, subject, source (règle, enseignant), reason, dismissed by and when |
| `flag_rules` | School thresholds (D34): average, unjustified absences, missing works; each value editable and each rule on or off |
| `school_settings` | Per-school switches, starting with flag visibility for students and for parents (D36) |
| `appreciations` | Student, subject (empty for the appréciation générale, D37), term, author, text |
| `message_threads`, `messages` | One thread per student and teacher with the student's parents |

Also: `posts` gets an optional `notion_id`. `classes` gets `head_teacher_id` (professeur principal).

## 5. Information architecture

One shell for all roles: a sidebar on the left, a top bar with the school, a term switcher, and the account menu. Each role sees only its own items.

| Role | Sidebar | Home answers |
|---|---|---|
| Teacher | Accueil, Mes classes, Carnet de notes, Présences, Emploi du temps, Messages | Which registers are open today? Which work is waiting for grading? Which class is behind on the programme? Which students need attention? |
| Student | Accueil, Mes matières, Notes, Emploi du temps | What is due, and when? |
| Parent | Accueil (child switcher), Travail, Notes, Absences, Messages, Emploi du temps | Is my child on track this week? |
| Admin | Accueil, École (structure), Personnes, Emploi du temps, Suivi (attendance and grades overview), Paramètres | What is missing or late in the school? |
| Superadmin | Écoles, Utilisateurs, Demandes | Which requests are waiting? |

**Class space** (teacher view of one class and subject) has these tabs:

1. Travail (topics and posts)
2. Programme (chapitres, notions, planned week vs done)
3. Élèves (signals per student, flags, remarks, appréciation for the trimestre)
4. Notes
5. Présences
6. Emploi du temps

**Teacher home (Studio, picked 2026-10-26)** keeps the round-8 modules and adds two summaries:

1. **Programme**: one bar per class, notions covered vs weeks passed. Opens the class Programme tab.
2. **Élèves à suivre**: flagged students, with the reason. Opens the student in the class Élèves tab.

The professeur principal sees all subjects for their class (signals, flags, visible remarks, appréciations). Admin / vie scolaire sees school-wide flags in Suivi. Parents and students see grades, absences, missing work and the remarks marked "visible famille", and the flags if the admin allows it (D36).

## 6. Key user flows (MVP)

1. **Admin sets up the school.** Guided steps from année scolaire to emploi du temps. A progress indicator shows each step and its gaps, for example "3 matières sans enseignant".
2. **Teacher posts an assignment.** Class space → Nouveau → Devoir → title, instructions, file, due date, /20 or rubric → Publier.
3. **Student submits.** Accueil "À faire" → open the assignment → add text or a file → Rendre.
4. **Teacher grades.** Assignment → submission list → grade, comment, next student (one click) → Rendre les copies.
5. **Teacher takes attendance.** Accueil → today's slot → register opens with all students marked present → mark the exceptions → Valider.
6. **Parent follows a child.** Weekly email digest → link to the parent home → justify an absence in two steps.
7. **Teacher fills the cahier de textes.** Today's course → entry (done in class, devoir) → EduPlan suggests the next notion → confirm → programme progress updates.
8. **Teacher follows a student.** Home "Élèves à suivre" → student → signals and remarks → add a remark, dismiss the flag, or write to the parents.
9. **Teacher prepares the conseil.** Class Élèves tab → "Appréciations" → one student at a time with average, absences, missing work, remarks → next student (one click).
10. **Professeur principal writes the appréciations générales.** Their class → "Conseil" → one student at a time with every subject's average and appréciation → appréciation générale → next student.

## 7. Design direction: soft, approachable minimalism

| Attribute | Rule for EduPlan |
|---|---|
| Overall mood | Friendly, calm, thoughtful. Not enterprise |
| Visual density | Moderate. Group information in clear modules |
| Layout | Sidebar navigation, top-level controls, modular content areas |
| Components | Rounded cards, tabs, forms, progress indicators, content previews |
| Typography | Clear, functional, readable. One display face with character and one neutral body face. Pick both during the design pass |
| Color | Light backgrounds, restrained palette. One accent for each function, used as a quiet tint: Travail, Notes, Présences, Emploi du temps |
| Interaction | Guided workflows, contextual actions, progressive disclosure |
| Philosophy | Student-centered, collaborative, reflective |

Guardrails:

1. Use a light background with a slight tint. Do not use default UI-kit grey or cream.
2. Give surfaces depth with tone, not with large shadows.
3. Show function accents as soft tints. Do not use saturated fills.
4. Show empty states with the next action. Do not show blank tables.
5. Keep content visible by default. Animation must not hide content.

## 8. Order of work

| Step | Work | Estimate |
|---|---|---|
| 1 | Design pass: tokens, app shell, class space, teacher home (mock in `.impeccable/`). Teacher home: **Studio** picked 2026-10-26. Tokens: `DESIGN_HANDOVER_TEACHER_HOME.md` section 4. Mocks: `.impeccable/mocks/teacher-home/studio-{desktop,phone}.html`. Brief: `.impeccable/surfaces/src-app-dashboard-teacher-page-tsx.md`. Home with the Programme and Élèves à suivre modules: `.impeccable/mocks/teacher-home/studio-suivi-desktop.html`. Class Programme and Élèves tabs: designed in code, not mocked (D26). Visual variants of Studio: `STUDIO_VARIANTS_PLAN.md` | 1 to 2 days |
| 2 | New shell and IA in code, routes for each role | 1 day |
| 3 | Schema: years, terms, topics, posts, attachments, submissions, grades | 1 day |
| 4 | Class space and post creation | 2 days |
| 5 | Submission and grading loop, gradebook | 2 to 3 days |
| 6 | Attendance per slot, parent justification | 2 days |
| 7 | Role-based homes with live data | 1 to 2 days |
| 8 | Parent weekly digest (email) | 1 day |
| 9 | Guided admin setup | 2 days |
| 10 | Programme: school import, class plans, cahier de textes link | 2 days |
| 11 | Suivi d'élèves: signals, flag rules, remarks | 2 days |
| 12 | Appréciations for the conseil | 1 day |
| 13 | Messages famille (thread per student) | 1 to 2 days |

Total: about 19 to 23 working days for one developer.

## 9. Decisions

All accepted and open decisions live in `DECISIONS.md` (D1 to D28).
