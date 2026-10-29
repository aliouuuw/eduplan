// School years and their trimestres (D40, D41): created and closed by the admin in Réglages.
import 'server-only';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { academicYears, classes, schools, terms } from '@/db/schema';
import type { Database } from '@/lib/db';
import { generateId } from '@/lib/utils';

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.');
const span = { startsOn: isoDay, endsOn: isoDay };

export const yearInput = z.object({
  name: z.string().trim().min(1, "Donnez un nom à l'année.").max(40),
  ...span,
  terms: z.array(z.object({ name: z.string().trim().min(1, 'Donnez un nom au trimestre.').max(40), ...span })).min(1).max(4),
}).superRefine((year, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (year.startsOn >= year.endsOn) return issue("L'année doit finir après son début.");
  let previousEnd = '';
  for (const term of year.terms) {
    if (term.startsOn >= term.endsOn) return issue(`${term.name} doit finir après son début.`);
    if (term.startsOn < year.startsOn || term.endsOn > year.endsOn) return issue(`${term.name} doit être compris dans l'année.`);
    if (term.startsOn <= previousEnd) return issue(`${term.name} doit commencer après la fin du trimestre précédent.`);
    previousEnd = term.endsOn;
  }
});

export type YearInput = z.infer<typeof yearInput>;

export async function listYears(db: Database, schoolId: string) {
  const years = await db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)).orderBy(desc(academicYears.startsOn));
  const termRows = await db.select().from(terms).where(eq(terms.schoolId, schoolId)).orderBy(asc(terms.position));
  return years.map((year) => ({ ...year, terms: termRows.filter((term) => term.academicYearId === year.id) }));
}

export async function createYear(db: Database, schoolId: string, input: YearInput, now = new Date()) {
  return db.transaction(async (tx) => {
    // Locking the school row runs two creates for one school one after the other, so the checks below see each other.
    await tx.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId)).for('update');
    const existing = await tx.select().from(academicYears).where(eq(academicYears.schoolId, schoolId));
    if (existing.some((year) => year.name === input.name)) return { ok: false as const, reason: 'duplicate_name' as const };
    if (existing.some((year) => year.startsOn <= input.endsOn && year.endsOn >= input.startsOn)) {
      return { ok: false as const, reason: 'overlap' as const };
    }

    const id = generateId();
    // The first year of a school becomes current; later ones wait for the admin to switch.
    await tx.insert(academicYears).values({ id, schoolId, name: input.name, startsOn: input.startsOn, endsOn: input.endsOn, isCurrent: existing.length === 0, createdAt: now, updatedAt: now });
    await tx.insert(terms).values(input.terms.map((term, index) => ({
      id: generateId(), schoolId, academicYearId: id, name: term.name, position: index + 1,
      startsOn: term.startsOn, endsOn: term.endsOn, createdAt: now, updatedAt: now,
    })));
    // Classes created before their year existed carry only the label: link them now.
    await tx.update(classes).set({ academicYearId: id }).where(and(eq(classes.schoolId, schoolId), eq(classes.academicYear, input.name), isNull(classes.academicYearId)));
    return { ok: true as const, id };
  });
}

export async function setCurrentYear(db: Database, schoolId: string, yearId: string, now = new Date()) {
  const [year] = await db.select({ id: academicYears.id }).from(academicYears).where(and(eq(academicYears.id, yearId), eq(academicYears.schoolId, schoolId)));
  if (!year) return false;
  // One transaction: the unique index allows one current year, so clear before setting.
  // The school lock stops two switches from clearing together and then both setting.
  await db.transaction(async (tx) => {
    await tx.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId)).for('update');
    await tx.update(academicYears).set({ isCurrent: false, updatedAt: now }).where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)));
    await tx.update(academicYears).set({ isCurrent: true, updatedAt: now }).where(and(eq(academicYears.id, yearId), eq(academicYears.schoolId, schoolId)));
  });
  return true;
}

export async function setTermClosed(db: Database, schoolId: string, termId: string, closed: boolean, now = new Date()) {
  const rows = await db
    .update(terms)
    .set({ closedAt: closed ? now : null, updatedAt: now })
    .where(and(eq(terms.id, termId), eq(terms.schoolId, schoolId)))
    .returning({ id: terms.id });
  return rows.length > 0;
}
