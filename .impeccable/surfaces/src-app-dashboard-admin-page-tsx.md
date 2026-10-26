---
version: 1
slug: "src-app-dashboard-admin-page-tsx"
primary_target: "src/app/dashboard/admin/page.tsx"
related_targets: []
---

Scope: admin home (/dashboard/admin). Mode: Operate. All roles are first-class in the product; this surface serves the school admin.

Task: see the week at a glance, find the gaps to fix, reach scheduling in one step. Content: real school data (classes, teachers, subjects, slots, workload). UI language: French.

User steer (2026-10-22): keep La Frise, but more spacious, less crowded, softer and modern.

## Direction contract

THESIS: The school week drawn as Encarta's Interactive Timeline, each slot coloured by its subject family. It refuses the KPI-card grid plus activity table that school dashboards ship.

OWN-WORLD: Encarta royal blue #1f3c9b as an inset rounded rail; soft tinted ground #f2f4fb; white surfaces with 20px radius and tight tinted shadows; flat category colours (français rose, sciences exactes bleu, vivant vert, histoire brique, langues sarcelle, philo violet, EPS citron, arts rouge); gold #f2b631 for today and the primary action. Georgia for headings and numbers, system UI sans for everything else.

STORY: The admin sees today inside the week, sees which teachers carry too many hours with the classes behind each count, fixes the gap or starts scheduling.

FIRST VIEWPORT: Left rail, 7 items. Header: date in Georgia 38px, search, gold "Lancer la planification". A full-width frise card: 5 day columns, today on a soft gold column, 4 class rows of 8 rounded slots, a "now" line, a level filter, a legend. Below: "À régler" (each count with its proof, solved items stamped "Réglé") beside four Georgia numbers.

FORM: Encarta Interactive Timeline, candidate 3 of 7, seed:4a230948c7a5fa68. Raises: scale contrast (specimen), one thing owns the viewport (feed), count plus proof (marketing), stamped not deleted (wallet), flat colour (zoo).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
