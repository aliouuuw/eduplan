# EduPlan references

Every external source used in the product and design work so far (2026-10-25 to 2026-10-26). Use these to re-check a decision, not to copy layouts or content.

## 1. Design feel (named by the user)

The user's own list for "soft, approachable minimalism". **Superlist is the most important.**

| Product | Link | What to take |
|---|---|---|
| Toddle | https://www.toddleapp.com/ | Warm, editorial, card-based educational workspace. The main product benchmark |
| Superlist | https://www.superlist.com/ | Calm lists, round checkboxes, generous space, little chrome |
| Craft | https://www.craft.do/ | Documents as soft white sheets, content first |
| Lemon Squeezy | https://www.lemonsqueezy.com/ | Lavender palette, friendly product UI |
| Headspace | https://www.headspace.com/ | Warmth, coral, approachable tone |
| Notion Calendar | https://www.notion.com/product/calendar | Precise calendar views, neutral chrome, tinted events |
| Seesaw | https://web.seesaw.me/ | Student work and portfolios shared with families |
| ClassDojo | https://www.classdojo.com/ | Friendly classroom tools for teachers and parents |
| Notion | https://www.notion.com/ | Hierarchy and consistency of a productivity tool |
| Things 3 | https://culturedcode.com/things/ | Task lists, calm visual rhythm |

### Toddle product pages (from the user's design brief)

- Product overview: https://www.toddleapp.com/
- Curriculum planning for K-12: https://www.toddleapp.com/curriculum-planning/
- LMS for Understanding by Design: https://www.toddleapp.com/ubd/
- Toddle and Sentral integration (LMS + SIS): https://www.toddleapp.com/integrations/
- The user's brief describes Toddle as "a collaborative educational workspace with a soft, editorial SaaS aesthetic". The full brief is in `DESIGN_HANDOVER_TEACHER_HOME.md`, section 3.

The Toddle sub-page URLs above were reconstructed from the page titles in the user's paste. All links in section 1 returned HTTP 200 on 2026-10-26 (Seesaw returns 403 to scripts but opens in a browser). Their content was not re-read.

## 2. Reference images (saved in `project_docs/references/`)

| File | What it shows | Used for |
|---|---|---|
| `dribbble-edtech-progress-dashboard.png` | Edtech dashboard: icon dock, stat cards, performance curve, task checklist (orange) | Studio structure (round 3) |
| `learnup-soft-ui-mobile.png`, `softui-dash-2.png` | LearnUp mobile: stat cards with round arrow buttons, capsule day picker, lavender | Soft UI shapes and lavender palette (rounds 5 to 7) |
| `lms-course-outline.png` | LMS course outline: tree sidebar, cover, accordions of modules | Lagune and Feuille de route structure |
| `softui-dash-3.png`, `softui-dash-4.png` | Course outline and course player with path list, tabs, transcript | Tabs, list rows, progress card (round 5) |

## 3. Product and market research

### Toddle and its alternatives

- Toddle feature overview: https://www.toddleapp.com/
- Gibbon (open source school platform, PHP): https://github.com/GibbonEdu/core, modules: https://github.com/GibbonEdu/core/tree/v30.0.00/modules
- RosarioSIS (open source SIS, PHP): https://github.com/francoisjacquet/rosariosis
- Frappe Education (Python): https://github.com/frappe/education
- Frappe LMS (Python): https://github.com/frappe/lms
- OpenEduCat (Odoo): https://github.com/openeducat/openeducat_erp
- ClassroomIO (SvelteKit + Supabase): https://github.com/classroomio/classroomio
- LearnHouse: https://github.com/learnhouse/learnhouse
- SchoolOS backend (Express + MongoDB, MIT): https://github.com/hamidukarimi/SchoolOS-backend
- VidyalayaOne (Express + Prisma microservices): https://github.com/vidyalayaone/vidyalayaone
- Obserfy (Montessori, TypeScript): https://github.com/obserfy/obserfy
- FET timetable solver: https://lalescu.ro/liviu/fet/
- GitHub topic, school management in TypeScript: https://github.com/topics/school-management?l=typescript

### LMS comparisons

- Raccoon Gang, K-12 LMS 2026: https://raccoongang.com/blog/open-source-lms-for-schools/
- Raccoon Gang, open source LMS 2026: https://raccoongang.com/blog/open-source-lms-everything-you-need-know/
- Teachfloor, free and open source LMS 2026: https://www.teachfloor.com/blog/best-free-and-open-source-lms-platforms

### Google Classroom (the daily loop we borrow)

- Role-based homepage, July 2026: https://workspaceupdates.googleblog.com/2026/07/redesigned-google-classroom-homepage-with-tailored-views-based-on-users-role.html
- Screencast and audio recording, January 2026: https://workspaceupdates.googleblog.com/2026/01/record-screencasts-audio-video-classroom.html
- Gemini in Classroom, June 2026: https://workspaceupdates.googleblog.com/2026/06/updates-to-gemini-in-google-classroom.html

## 4. Design lessons

### Airbnb redesign (round 8)

- Bloomberg, flat design and dimensional icons: https://www.bloomberg.com/news/articles/2025-06-13/apple-airbnb-ditch-flat-app-icons-for-new-3d-ui-design
- It's Nice That, app redesign: https://www.itsnicethat.com/articles/airbnb-app-redesign-140525
- Google Design, clarity and charm (labels next to icons): https://design.google/library/airbnb-communicating-clarity-and-charm
- UX Collective, winter redesign takeaways: https://uxdesign.cc/key-takeaways-from-airbnbs-winter-redesign-c1de0efa7818
- ADPList, winter redesign lessons: https://adplist.substack.com/p/lessons-behind-airbnbs-winter-redesign
- One Thing, the texture era: https://onethingnewsletter.substack.com/p/airbnbs-relaunch-and-the-texture?open=false

### Type

- Fontshare (licensed-quality free faces, self-host): https://www.fontshare.com/
- Chosen face: Ranade, https://www.fontshare.com/fonts/ranade

## 5. Ways of working

- Claude Code best practices (official): https://code.claude.com/docs/en/best-practices
- Agentic coding practices: https://medium.com/@habib.mrad.83/claude-code-practical-best-practices-for-agentic-coding-2be1b62cfeff
- NYU Shanghai RITS, agentic coding with Claude Code: https://rits.shanghai.nyu.edu/ai/unlocking-efficiency-best-practices-for-agentic-coding-with-claude-code/
- Plan derived from these: `project_docs/AGENT_WORKFLOW_PLAN.md`
