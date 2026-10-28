import { notFound } from 'next/navigation';
import { cache } from 'react';

import { ClassShell } from '@/components/teacher/class-shell';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getClassProgramme } from '@/lib/data/class-programme';
import { db } from '@/lib/db';
import { classLabel } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';
import { cn } from '@/lib/utils';

// Metadata and page share one load per request.
const loadProgramme = cache(getClassProgramme);

export async function generateMetadata({ params }: { params: Promise<{ classId: string; subjectId: string }> }) {
  const { classId, subjectId } = await params;
  const viewer = await requireSchoolRole('teacher');
  const programme = await loadProgramme(db, viewer.userId, viewer.schoolId, classId, subjectId);
  if (!programme) return { title: 'Programme · EduPlan' };
  return { title: `Programme · ${classLabel(programme.className)} · ${programme.subjectName}` };
}

export default async function ClassProgrammePage({ params }: { params: Promise<{ classId: string; subjectId: string }> }) {
  const { classId, subjectId } = await params;
  const viewer = await requireSchoolRole('teacher');
  const programme = await loadProgramme(db, viewer.userId, viewer.schoolId, classId, subjectId);
  if (!programme) notFound();

  const current = programme.chapters.find((chapter) => chapter.status === 'current');

  return (
    <ClassShell
      classId={classId}
      subjectId={subjectId}
      className={programme.className}
      subjectName={programme.subjectName}
      studentCount={programme.studentCount}
      roomLabel={programme.roomLabel}
      termName={programme.termName}
      week={programme.week}
      weeks={programme.weeks}
      active="programme"
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_372px]">
        <Card>
          <div className="px-7">
            <CardTitle>Chapitres et notions</CardTitle>
            <p className="text-sm text-muted-foreground">programme de l'école, ordre de la classe</p>
          </div>
          <CardContent>
            {programme.chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun chapitre pour cette classe.</p>
            ) : (
              programme.chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className={cn(
                    'border-t border-border py-4 first:border-t-0',
                    chapter.status === 'current' && 'rounded-none bg-gradient-to-b from-progress-faint to-transparent -mx-7 px-7 pb-2',
                  )}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[13px] text-muted-foreground">Ch. {chapter.index}</span>
                    <h3 className="min-w-0 flex-1 font-medium">{chapter.title}</h3>
                    <span className="text-[13.5px] text-muted-foreground">{chapter.weekLabel}</span>
                    <span
                      className={cn(
                        'text-[13.5px] font-medium',
                        chapter.stateLabel.includes('retard') ? 'text-now-ink' : 'text-progress-ink',
                        chapter.status === 'upcoming' && 'text-muted-foreground',
                      )}
                    >
                      {chapter.stateLabel}
                    </span>
                  </div>
                  {chapter.notions.length > 0 && (
                    <ul className="mt-3 ml-[58px] flex flex-col">
                      {chapter.notions.map((notion) => (
                        <li
                          key={notion.id}
                          className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3.5 border-t border-border py-2.5 first:border-t-0"
                        >
                          <span
                            className={cn(
                              'size-5 rounded-full border-[1.7px]',
                              notion.covered ? 'border-transparent fill-progress shadow-glow-progress' : 'border-progress-edge',
                              !notion.covered && notion.hint?.includes("aujourd'hui") && 'border-dashed border-now',
                            )}
                          />
                          <span className={cn(!notion.covered && notion.hint?.includes("aujourd'hui") && 'font-medium')}>{notion.title}</span>
                          <span className={cn('text-[13px]', notion.hint?.includes("aujourd'hui") ? 'font-medium text-now-ink' : 'text-muted-foreground')}>
                            {notion.hint}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <div className="px-7">
            <CardTitle>Rythme</CardTitle>
            {programme.week && <p className="text-sm text-muted-foreground">à la semaine {programme.week}</p>}
          </div>
          <CardContent>
            <p className="font-display text-[52px] leading-none tracking-tight">
              {programme.pace.covered}
              <span className="ml-2 font-sans text-lg text-muted-foreground">sur {programme.pace.total} notions</span>
            </p>
            {current && programme.pace.total > 0 && (
              <Progress
                className="my-4"
                glow
                label={`${classLabel(programme.className)} : ${programme.pace.covered} notions sur ${programme.pace.total}`}
                value={(programme.pace.covered / programme.pace.total) * 100}
                expected={(programme.pace.expected / programme.pace.total) * 100}
              />
            )}
            <p className="text-sm text-muted-foreground">
              {programme.pace.expected} notions attendues à ce jour
              {programme.pace.behind > 0 && (
                <>
                  {' '}
                  · <span className="font-medium text-now-ink">{programme.pace.behind} de retard</span>
                </>
              )}
            </p>
            <div className="mt-4 flex flex-col border-t border-border text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-ink-2">Reste à faire</span>
                <b className="font-medium">{programme.pace.remaining} notions</b>
              </div>
              <div className="flex justify-between border-t border-border py-2.5">
                <span className="text-ink-2">Semaines restantes</span>
                <b className="font-medium">{programme.pace.weeksLeft}</b>
              </div>
              <div className="flex justify-between border-t border-border py-2.5">
                <span className="text-ink-2">Pour finir à temps</span>
                <b className="font-medium">{programme.pace.perWeek} par semaine</b>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClassShell>
  );
}
