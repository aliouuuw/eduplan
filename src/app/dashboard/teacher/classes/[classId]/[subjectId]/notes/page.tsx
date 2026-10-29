import { CalendarX, ClipboardCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { ClassShell } from '@/components/teacher/class-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MeterSplit } from '@/components/ui/stat';
import { averageBands, getGradebook, type GradebookCell } from '@/lib/data/grading';
import { classSpaceHref } from '@/lib/data/teacher-classes';
import { db } from '@/lib/db';
import { classLabel, formatGrade, formatShortDay } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';
import { cn } from '@/lib/utils';

type Params = { params: Promise<{ classId: string; subjectId: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

// Metadata and page share one load per request.
const loadGradebook = cache(async (classId: string, subjectId: string, termId: string | null) => {
  const viewer = await requireSchoolRole('teacher');
  return getGradebook(db, viewer.userId, viewer.schoolId, classId, subjectId, { termId });
});
const termOf = (value: string | string[] | undefined) => (typeof value === 'string' ? value : null);
const CORRECTION = '/dashboard/teacher/notes';

export async function generateMetadata({ params, searchParams }: Params) {
  const { classId, subjectId } = await params;
  const view = await loadGradebook(classId, subjectId, termOf((await searchParams).term));
  if (!view) return { title: 'Notes · EduPlan' };
  return { title: `Notes · ${classLabel(view.header.className)} · ${view.header.subjectName}` };
}

function Cell({ cell }: { cell: GradebookCell }) {
  if (cell.kind === 'grade') return <span className={cn(cell.value < 10 && 'text-now-ink')}>{formatGrade(cell.value)}</span>;
  if (cell.kind === 'waiting') return <span className="text-[13px] font-medium text-progress-ink">à corriger</span>;
  if (cell.kind === 'missing') return <span className="text-[13px] text-muted-foreground">non rendu</span>;
  return <span className="text-muted-foreground">–</span>;
}

export default async function ClassNotesPage({ params, searchParams }: Params) {
  const { classId, subjectId } = await params;
  const view = await loadGradebook(classId, subjectId, termOf((await searchParams).term));
  if (!view) notFound();
  const { header, context, works, students, average, hasOther } = view;
  const { term, terms, year } = context;
  const graded = works.filter((work) => work.average !== null).length;
  const bands = averageBands(students.map((student) => student.average));
  const counted = bands.low + bands.mid + bands.high;
  const page = classSpaceHref(classId, subjectId, 'notes');

  return (
    <ClassShell {...header} active="notes">
      {!term ? (
        <Card>
          <EmptyState icon={<CalendarX />} title="Pas de trimestres pour cette classe">
            L&apos;administration crée l&apos;année et ses trimestres dans Réglages. Le carnet de notes apparaîtra ensuite.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_372px]">
          <Card className="min-w-0">
            <div className="px-7">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <CardTitle>Carnet de notes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  notes sur 20, moyennes pondérées par coefficient
                  {!context.editable && (year?.isCurrent ? ' · trimestre clôturé' : ' · année terminée')}
                </p>
              </div>
              {/* Links, not client state: the trimestre lives in the URL (D41). */}
              <nav aria-label="Trimestres" className="mt-4 flex w-max max-w-full gap-1 overflow-x-auto rounded-[22px] bg-progress-faint p-1">
                {terms.map((t) => (
                  <Link
                    key={t.id}
                    href={`${page}?term=${t.id}`}
                    aria-current={t.id === term.id ? 'page' : undefined}
                    className={cn(
                      'flex h-[34px] shrink-0 items-center rounded-[17px] px-3.5 text-sm font-medium text-ink-2 transition-colors hover:text-foreground',
                      t.id === term.id && 'bg-card text-foreground shadow-tab',
                    )}
                  >
                    {t.name}
                  </Link>
                ))}
              </nav>
            </div>
            <CardContent>
              {students.length === 0 ? (
                <EmptyState icon={<Users />} title="Aucun élève inscrit">
                  L&apos;administration inscrit les élèves dans la classe. Leurs notes apparaîtront ici.
                </EmptyState>
              ) : works.length === 0 && !hasOther ? (
                <EmptyState
                  icon={<ClipboardCheck />}
                  title="Aucun devoir ce trimestre"
                  action={
                    <Button asChild variant="secondary">
                      <Link href={CORRECTION}>Voir le carnet de tous mes devoirs</Link>
                    </Button>
                  }
                >
                  Les devoirs et contrôles datés dans ce trimestre font chacun une colonne, avec la moyenne de chaque élève.
                </EmptyState>
              ) : (
                <>
                  <div className="-mx-3.5 overflow-x-auto px-3.5">
                    <table className="w-full border-separate border-spacing-0 text-[14.5px] tabular-nums">
                      <thead>
                        <tr className="text-[13.5px]">
                          <th scope="col" className="border-b border-border px-2.5 pb-2.5 text-left align-bottom font-normal text-muted-foreground">Élève</th>
                          {works.map((work) => (
                            <th key={work.id} scope="col" className="border-b border-border px-2.5 pb-2.5 text-right align-bottom font-medium">
                              <Link href={`${CORRECTION}/${work.id}`} className="block min-w-21 transition-colors hover:text-progress-ink">{work.title}</Link>
                              <span className="block text-[12.5px] font-normal whitespace-nowrap text-muted-foreground">
                                {formatShortDay(new Date(work.day))} · coef. {formatGrade(work.coefficient)}
                              </span>
                            </th>
                          ))}
                          {hasOther && (
                            <th scope="col" className="border-b border-border px-2.5 pb-2.5 text-right align-bottom font-medium whitespace-nowrap">
                              Autres notes<span className="block text-[12.5px] font-normal text-muted-foreground">hors devoir</span>
                            </th>
                          )}
                          <th scope="col" className="sticky right-0 border-b border-border bg-card px-2.5 pb-2.5 pl-4 text-right align-bottom font-medium">
                            Moyenne<span className="block text-[12.5px] font-normal text-muted-foreground">/ 20</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id} className="group transition-colors hover:bg-progress-faint">
                            <th scope="row" className="rounded-l-[14px] px-2.5 py-2.5 text-left font-medium whitespace-nowrap">{student.name}</th>
                            {student.cells.map((cell, index) => (
                              <td key={works[index].id} className="px-2.5 py-2.5 text-right whitespace-nowrap"><Cell cell={cell} /></td>
                            ))}
                            {hasOther && (
                              <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                                {student.other.length ? student.other.map((value) => formatGrade(value)).join(' · ') : <span className="text-muted-foreground">–</span>}
                              </td>
                            )}
                            {/* Pinned: the average stays in view when the works scroll. */}
                            <td className={cn('sticky right-0 rounded-r-[14px] bg-card px-2.5 py-2.5 pl-4 text-right font-semibold transition-colors group-hover:bg-progress-faint', student.average !== null && student.average < 10 && 'text-now-ink')}>
                              {student.average === null ? <span className="font-normal text-muted-foreground">–</span> : formatGrade(student.average, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3.5 flex justify-between gap-4 px-3 text-[13.5px] text-muted-foreground">
                    <span>{students.length} élève{students.length > 1 ? 's' : ''} · triés par nom</span>
                    <span>{graded} devoir{graded > 1 ? 's' : ''} noté{graded > 1 ? 's' : ''} sur {works.length}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="px-7">
              <CardTitle>Moyenne de la classe</CardTitle>
            </div>
            <CardContent>
              <p className="font-display text-[52px] leading-none tracking-tight">
                {average === null ? '–' : formatGrade(average, 2)}
                <span className="ml-2 font-sans text-lg text-muted-foreground">/ 20</span>
              </p>
              {counted > 0 ? (
                <>
                  <div className="mt-5">
                    <MeterSplit
                      label={`${bands.low} sous 10, ${bands.mid} de 10 à 14, ${bands.high} à 14 et plus`}
                      parts={[{ value: bands.low, tone: 'now' }, { value: bands.mid, tone: 'soft-progress' }, { value: bands.high, tone: 'progress' }]}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[13px] text-muted-foreground">
                    <span><b className="block font-display text-[22px] font-normal text-now-ink">{bands.low}</b>sous 10</span>
                    <span><b className="block font-display text-[22px] font-normal text-foreground">{bands.mid}</b>de 10 à 14</span>
                    <span><b className="block font-display text-[22px] font-normal text-progress-ink">{bands.high}</b>14 et plus</span>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Aucune note ce trimestre.</p>
              )}
              {works.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[15px] font-medium">Par devoir</h3>
                  <ul className="mt-1 flex flex-col">
                    {works.map((work) => (
                      <li key={work.id} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 border-t border-border py-2.5 text-sm first:border-t-0">
                        <span>
                          {work.title}
                          <span className="block text-[12.5px] text-muted-foreground">{formatShortDay(new Date(work.day))}</span>
                        </span>
                        <span className="text-[13px] text-muted-foreground">coef. {formatGrade(work.coefficient)}</span>
                        {work.toGrade > 0 ? (
                          <Link href={`${CORRECTION}/${work.id}`} className="text-right font-medium whitespace-nowrap text-progress-ink">{work.toGrade} à corriger</Link>
                        ) : (
                          <b className="text-right font-medium">{work.average === null ? '–' : formatGrade(work.average, 2)}</b>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-5 text-[13.5px] leading-relaxed text-muted-foreground">
                Chaque note compte selon le coefficient de son devoir. Une copie non rendue compte seulement si vous lui donnez une note.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </ClassShell>
  );
}
