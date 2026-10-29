// Navigation per role (MVP_REWORK_PLAN.md section 5). Data only: the layout turns `icon` keys into icons.
// Labels are short so they fit under the dock icons; page titles use the full names.

export type Role = "superadmin" | "admin" | "teacher" | "parent" | "student"

export type IconKey =
  | "home"
  | "classes"
  | "notes"
  | "attendance"
  | "messages"
  | "agenda"
  | "work"
  | "subjects"
  | "school"
  | "people"
  | "tracking"
  | "settings"
  | "schools"
  | "requests"

export type NavItem = {
  href: string
  label: string
  icon: IconKey
  /** other path prefixes that belong to this section (keeps it lit on sub-pages) */
  match?: string[]
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Super-admin",
  admin: "Administration",
  teacher: "Enseignant",
  parent: "Parent",
  student: "Élève",
}

const T = "/dashboard/teacher"
const P = "/dashboard/parent"
const S = "/dashboard/student"
const A = "/dashboard/admin"
const SA = "/dashboard/superadmin"

export const NAV: Record<Role, NavItem[]> = {
  teacher: [
    { href: T, label: "Accueil", icon: "home" },
    { href: `${T}/classes`, label: "Classes", icon: "classes" },
    { href: `${T}/notes`, label: "Notes", icon: "notes" },
    { href: `${T}/presences`, label: "Présences", icon: "attendance" },
    { href: `${T}/messages`, label: "Messages", icon: "messages" },
    { href: `${T}/timetable`, label: "Agenda", icon: "agenda", match: [`${T}/availability`] },
  ],
  student: [
    { href: S, label: "Accueil", icon: "home" },
    { href: `${S}/matieres`, label: "Matières", icon: "subjects" },
    { href: `${S}/notes`, label: "Notes", icon: "notes" },
    { href: `${S}/agenda`, label: "Agenda", icon: "agenda" },
  ],
  parent: [
    { href: P, label: "Accueil", icon: "home" },
    { href: `${P}/travail`, label: "Travail", icon: "work" },
    { href: `${P}/notes`, label: "Notes", icon: "notes" },
    { href: `${P}/absences`, label: "Absences", icon: "attendance" },
    { href: `${P}/messages`, label: "Messages", icon: "messages" },
    { href: `${P}/agenda`, label: "Agenda", icon: "agenda" },
  ],
  admin: [
    { href: A, label: "Accueil", icon: "home" },
    { href: `${A}/classes`, label: "École", icon: "school", match: [`${A}/class-groups`, `${A}/subjects`, `${A}/teachers`] },
    { href: `${A}/users`, label: "Personnes", icon: "people", match: [`${A}/invitations`] },
    { href: `${A}/scheduling`, label: "Agenda", icon: "agenda" },
    { href: `${A}/suivi`, label: "Suivi", icon: "tracking" },
    { href: `${A}/parametres`, label: "Réglages", icon: "settings" },
  ],
  superadmin: [
    { href: SA, label: "Accueil", icon: "home" },
    { href: `${SA}/schools`, label: "Écoles", icon: "schools" },
    { href: `${SA}/users`, label: "Comptes", icon: "people" },
  ],
}

export type Section = { prefixes: string[]; links: { href: string; label: string }[] }

/** Sub-pages of the teacher sections, shown as tabs under the page header. */
export const TEACHER_SECTIONS: Section[] = [
  {
    prefixes: [`${T}/timetable`, `${T}/availability`],
    links: [
      { href: `${T}/timetable`, label: "Emploi du temps" },
      { href: `${T}/availability`, label: "Disponibilités" },
    ],
  },
]

/** Sub-pages of the admin sections, shown as tabs under the page header. */
export const ADMIN_SECTIONS: Section[] = [
  {
    prefixes: [`${A}/classes`, `${A}/class-groups`, `${A}/subjects`, `${A}/teachers`],
    links: [
      { href: `${A}/classes`, label: "Classes" },
      { href: `${A}/class-groups`, label: "Niveaux" },
      { href: `${A}/subjects`, label: "Matières" },
      { href: `${A}/teachers`, label: "Enseignants" },
    ],
  },
  {
    prefixes: [`${A}/users`, `${A}/invitations`],
    links: [
      { href: `${A}/users`, label: "Comptes" },
      { href: `${A}/invitations`, label: "Invitations" },
    ],
  },
  {
    prefixes: [`${A}/scheduling`],
    links: [
      { href: `${A}/scheduling/timetables`, label: "Emplois du temps" },
      { href: `${A}/scheduling/time-slots`, label: "Créneaux" },
      { href: `${A}/scheduling/templates`, label: "Modèles" },
    ],
  },
]

/** The nav item that owns `pathname`: exact or prefix match on href and `match`, longest prefix wins. */
export function activeHref(items: NavItem[], pathname: string): string | undefined {
  let best: { href: string; len: number } | undefined
  for (const it of items) {
    for (const prefix of [it.href, ...(it.match ?? [])]) {
      if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && (!best || prefix.length > best.len)) {
        best = { href: it.href, len: prefix.length }
      }
    }
  }
  return best?.href
}
