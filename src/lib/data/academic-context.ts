// Which year and term a screen shows (D41). The term comes from the URL (`?term=<id>`);
// without one, the term that contains today, else the last finished term, else the first.
import 'server-only';
import { and, asc, eq } from 'drizzle-orm';

import { academicYears, terms } from '@/db/schema';
import type { Database } from '@/lib/db';

type Year = typeof academicYears.$inferSelect;
type Term = typeof terms.$inferSelect;

export type AcademicContext = {
  year: Year | null;
  terms: Term[];
  term: Term | null;
  /** False for a closed term or a past year: show it, do not write to it. */
  editable: boolean;
};

export function defaultTerm(rows: Term[], day: string): Term | null {
  return rows.find((row) => row.startsOn <= day && row.endsOn >= day)
    ?? rows.filter((row) => row.endsOn < day).at(-1)
    ?? rows[0]
    ?? null;
}

export async function yearIdForLabel(db: Database, schoolId: string, label: string) {
  const [row] = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.name, label)))
    .limit(1);
  return row?.id ?? null;
}

export async function getAcademicContext(
  db: Database,
  schoolId: string,
  { day, termId, yearId }: { day: string; termId?: string | null; yearId?: string | null },
): Promise<AcademicContext> {
  // A term from the URL is trusted only after the school check; anything else falls back to the default.
  // With a year given, the term must belong to it: a class's tab never shows another year's term.
  const [requested] = termId
    ? await db.select().from(terms).where(and(eq(terms.id, termId), eq(terms.schoolId, schoolId), yearId ? eq(terms.academicYearId, yearId) : undefined)).limit(1)
    : [];
  const [year] = await db
    .select()
    .from(academicYears)
    .where(and(
      eq(academicYears.schoolId, schoolId),
      requested ? eq(academicYears.id, requested.academicYearId)
        : yearId ? eq(academicYears.id, yearId)
        : eq(academicYears.isCurrent, true),
    ))
    .limit(1);
  if (!year) return { year: null, terms: [], term: null, editable: false };

  const rows = await db
    .select()
    .from(terms)
    .where(and(eq(terms.schoolId, schoolId), eq(terms.academicYearId, year.id)))
    .orderBy(asc(terms.position));
  const term = requested ?? defaultTerm(rows, day);
  return { year, terms: rows, term, editable: Boolean(year.isCurrent && term && !term.closedAt) };
}
