# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

EduPlan serves every role in a school, with no single role leading:

- Teachers post lessons, materials, and assignments for their classes, grade submitted work, and take attendance for each timetable slot.
- Students see what is due, submit their work, and see their grades and timetable.
- Parents follow each child: work due and missing, grades, absences. Parents justify absences.
- School admins set up the school (année scolaire, niveaux, classes, matières, enseignants, emploi du temps), invite users, and follow attendance and grades across the school.
- A superadmin manages schools, system users, and password reset requests.

## Product Purpose

EduPlan is one platform for the teaching and learning work of a school. Teachers post work, students submit it, teachers grade it, and parents see the result. Attendance and timetables support that loop. Success means each person sees their next action on their home screen, and nothing that happens in a class is lost between teacher, student, parent, and admin.

## Positioning

- Teaching and learning areas follow Toddle: planning, assessment, portfolios, reports, attendance, behaviour, communication.
- Operations areas follow Gibbon: admissions, finance, library, activities, staff, timetable building.
- The daily loop follows Google Classroom: post, submit, grade, return.
- The timetable is built from real constraints (weekly hours, qualifications, availability), and it feeds attendance and the class space.

## Operating Context

- Target schools are francophone, starting in Senegal (seed school: École Internationale de Dakar, code DAKAR-INT-2025, academic year 2025-2026).
- The French school ladder is the vocabulary: Primaire (CP, CE1, CE2, CM1, CM2) and Secondaire (6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Terminale), with parallel sections A and B.
- The French school system applies: grades out of 20 with coefficients, trimestres, appréciations, cahier de textes, bulletins.
- Accounts arrive by invitation. Password resets go through a superadmin request.

## Capabilities and Constraints

- Roles: superadmin, admin, teacher, parent, student.
- MVP: class space (lessons, materials, assignments by topic), submission and grading with a gradebook, attendance for each timetable slot, weekly parent email digest, a home for each role, programme progress (chapitres and notions), student follow-up (signals, flags, remarks), appréciations for the conseil, a teacher-parent thread per student.
- Kept from the first version: school structure, accounts, invitations, teacher availability, auto-scheduler.
- Out of the MVP: class news feed (stream), printed bulletins, unit planning beyond chapitres and notions, portfolios, behaviour incidents and sanctions, remplacements, other messages, AI, operations modules.
- Stack: Next.js App Router, React, Tailwind CSS v4, shadcn-style components on Radix, Drizzle ORM on libSQL/SQLite, NextAuth. Package manager: Bun.
- The UI language is French. The current code copy is English and must move to French.
- Plan and order of work: `project_docs/MVP_REWORK_PLAN.md`.

## Design Direction

Soft, approachable minimalism. The interface avoids the cold, technical look of enterprise software.

- Mood: friendly, calm, thoughtful.
- Density: moderate. Information sits in clear modules.
- Layout: sidebar navigation, top-level controls, modular content areas.
- Components: rounded cards, tabs, forms, progress indicators, content previews.
- Typography: clear, functional, readable.
- Color: light backgrounds, restrained palette, one quiet accent for each function (Travail, Notes, Présences, Emploi du temps).
- Interaction: guided workflows, contextual actions, progressive disclosure.

## Evidence on Hand

- Seed data in `scripts/seed-timetable-data.ts`: 24 classes, 19 subjects across two levels, 17 teachers with real Senegalese names, 480 students, time slots.
- No testimonials, customer logos, metrics, or press exist. Do not invent them.

## Product Principles

1. Each role sees its next action on its home screen in one step.
2. The class is the core object. Work, grades, attendance, and timetable meet there.
3. Show gaps before they become problems: missing work, ungraded work, unjustified absences, subjects with no teacher.
4. Guide complex tasks step by step. Show advanced options only when they are needed.
5. Speak the school's own language: French, the French class ladder, and the French grading system.
6. Every role is a first-class user. No screen assumes the reader is an admin unless it is an admin screen.
