import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Clock, Users } from 'lucide-react';

import { GradePaceChart } from '@/components/teacher/grade-pace-chart';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Stat, MeterDots, MeterSplit } from '@/components/ui/stat';
import { classSpaceHref } from '@/lib/data/teacher-classes';
import { getTeacherHome, type HomeSlot } from '@/lib/data/teacher-home';
import { db } from '@/lib/db';
import { classLabel, formatDay, frSpaces } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';
import { cn } from '@/lib/utils';

function SheetHead({
  title,
  meta,
  href,
  linkLabel,
}: {
  title: string;
  meta?: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-7">
      <CardTitle>{title}</CardTitle>
      {meta}
      {href && linkLabel && <SheetLink href={href}>{linkLabel}</SheetLink>}
    </div>
  );
}

function SheetLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-progress-ink [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5 hover:[&_svg]:-translate-y-0.5"
    >
      {children}
      <ArrowUpRight className="size-4" />
    </Link>
  );
}

function slotRoomLabel(room: string) {
  return room.replace(/^Salle/, 'salle');
}

function SlotCard({ slot }: { slot: HomeSlot }) {
  const live = slot.state === 'live';
  const done = slot.state === 'done';
  const called = done && slot.absents > 0;
  return (
    <div
      className={cn(
        'flex min-h-[150px] flex-col gap-0.5 rounded-[20px] p-4 transition-colors duration-200',
        live && 'wash-slot',
        !live && 'hover:bg-progress-faint',
        done && !called && 'text-muted-foreground',
      )}
    >
      <time className={cn('text-[13px] tabular-nums', live ? 'font-medium text-now-ink' : 'text-muted-foreground')}>
        {slot.start} · {slot.end}
      </time>
      <h3 className="font-display mt-1.5 text-xl tracking-tight">{classLabel(slot.className)}</h3>
      <p className={cn('text-[13.5px] leading-snug', live ? 'text-now-ink' : 'text-ink-2')}>{slot.placeLabel}</p>
      {live && (
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-[13px] font-medium text-now-ink">
          <Clock className="size-[15px]" />
          En cours
        </span>
      )}
      {called && (
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-[13px] text-muted-foreground">
          <Check className="size-[15px] stroke-[2.5] text-progress-ink" />
          {`Appel fait · ${slot.absents} absent${slot.absents > 1 ? 's' : ''}`}
        </span>
      )}
      {!live && !called && slot.state === 'later' && (
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-[13px] text-muted-foreground">
          <Users className="size-[15px]" />
          À venir
        </span>
      )}
    </div>
  );
}

export default async function TeacherHomePage() {
  const viewer = await requireSchoolRole('teacher');
  const now = new Date();
  const home = await getTeacherHome(db, viewer.userId, viewer.schoolId, now);
  const first = viewer.name.split(' ')[0] || viewer.name;
  const termLine = home.termName && home.week ? `${home.termName.toLowerCase()}, semaine ${home.week} sur ${home.weeks}` : null;
  const subtitle = termLine ? frSpaces(`${formatDay(now)} · ${termLine}`) : formatDay(now);
  const live = home.slots.find((slot) => slot.state === 'live');
  const nextSlot = home.slots.find((slot) => slot.state === 'later');
  const gradesLeft = home.gradesTarget - home.gradesEntered;
  const absenceAlert = home.flags.filter((flag) => flag.ruleKind === 'absences');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Bonjour, ${first}`} subtitle={subtitle} />
      {home.programme.length === 0 && home.flags.length === 0 && home.slots.length === 0 ? (
        <EmptyState title="Aucun cours pour l'instant">
          L'administration vous assigne une classe et une matière. Les copies, le programme et les élèves à suivre s'affichent ici.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_392px]">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardContent>
                  <Stat
                    label="Notes saisies pour le conseil"
                    value={home.gradesEntered}
                    unit={`sur ${home.gradesTarget}`}
                    caption={
                      gradesLeft > 0
                        ? `${gradesLeft} note${gradesLeft > 1 ? 's' : ''} à prévoir d'ici le conseil`
                        : 'Toutes les notes du trimestre sont saisies'
                    }
                  >
                    <MeterDots total={home.gradesTarget} done={home.gradesEntered} label={`${home.gradesEntered} notes sur ${home.gradesTarget}`} />
                  </Stat>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Stat
                    label="Copies à corriger"
                    value={home.copiesToGrade}
                    unit="copies"
                    caption={
                      home.copiesPaper > 0
                        ? `${home.copiesHomework} devoirs maison · ${home.copiesPaper} contrôles papier`
                        : 'Devoirs rendus, pas encore notés'
                    }
                  >
                    <MeterSplit
                      label={
                        home.copiesPaper > 0
                          ? `${home.copiesHomework} devoirs maison, ${home.copiesPaper} contrôles papier`
                          : `${home.copiesSubmitted} rendus, ${home.copiesLate} en retard`
                      }
                      parts={
                        home.copiesPaper > 0
                          ? [
                              { value: home.copiesHomework, tone: 'progress' },
                              { value: home.copiesPaper, tone: 'soft-now' },
                            ]
                          : [
                              { value: home.copiesSubmitted, tone: 'progress' },
                              { value: home.copiesLate, tone: 'soft-now' },
                            ]
                      }
                    />
                  </Stat>
                </CardContent>
              </Card>
            </div>
            {home.week && (
              <Card>
                <div className="flex flex-wrap items-center gap-3 px-7">
                  <CardTitle>Rythme des notes jusqu'au conseil</CardTitle>
                  <div className="ml-auto flex flex-wrap gap-4 text-[13px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-3.5 rounded-full bg-now" />
                      Saisies
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-3.5 rounded-full bg-progress/45" />
                      Rythme attendu
                    </span>
                  </div>
                </div>
                <CardContent>
                  <GradePaceChart
                    week={home.week}
                    weeks={home.weeks}
                    entered={home.gradesEntered}
                    expected={home.gradesExpected}
                    gradesTarget={home.gradesTarget}
                    gradesByWeek={home.gradesByWeek}
                  />
                </CardContent>
              </Card>
            )}
            <Card className="@container">
              <SheetHead title="Cours d'aujourd'hui" href="/dashboard/teacher/timetable" linkLabel="Emploi du temps" />
              <CardContent>
                {home.slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun cours ce jour.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 @[860px]:grid-cols-4">
                    {home.slots.map((slot) => (
                      <SlotCard key={slot.id} slot={slot} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <SheetHead
                title="Élèves à suivre"
                meta={<span className="rounded-full bg-progress-faint px-2.5 py-0.5 text-sm tabular-nums text-muted-foreground">{home.flags.length}</span>}
                href="/dashboard/teacher/classes"
                linkLabel="Tout voir"
              />
              <CardContent>
                {home.flags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun signal pour l'instant.</p>
                ) : (
                  home.flags.map((flag, index) => (
                    <div
                      key={flag.id}
                      className="grid items-center gap-3 border-t border-border py-3.5 first:border-t-0 sm:grid-cols-[auto_11rem_1fr_auto] sm:gap-x-5"
                    >
                      <Avatar name={flag.student} size="sm" tone={index % 2 === 0 ? 'now' : 'progress'} />
                      <div>
                        <p className="font-medium">{flag.student}</p>
                        <p className="text-[13.5px] text-muted-foreground">{classLabel(flag.className)}</p>
                      </div>
                      <p className="text-[14.5px] leading-snug text-ink-2">{flag.reason}</p>
                      <p className="text-[13px] text-muted-foreground sm:text-right">
                        {flag.source === 'rule' ? "Règle de l'école" : 'Ajouté par vous'}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-6">
            {live ? (
              <Card className="wash-now">
                <CardContent className="flex flex-col">
                  <p className="flex items-center gap-2 text-sm font-medium text-now-ink">
                    <span className="size-2 animate-pulse rounded-full bg-now shadow-glow-now motion-reduce:animate-none" />
                    {`En cours depuis ${live.start}`}
                  </p>
                  <h2 className="font-display mt-3 text-[32px] leading-[1.15] tracking-tight">
                    {`${classLabel(live.className)}, ${slotRoomLabel(live.room)}`}
                  </h2>
                  {live.topic && <p className="mt-1 text-muted-foreground">{live.topic}</p>}
                  <Button asChild size="sm" className="mt-5 w-fit">
                    <Link href="/dashboard/teacher/presences">
                      <Check />
                      Faire l'appel
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              nextSlot && (
                <Card className="bg-progress-faint/80">
                  <CardContent>
                    <p className="text-sm font-medium text-progress-ink">Prochain cours</p>
                    <h2 className="font-display mt-2 text-2xl tracking-tight">{classLabel(nextSlot.className)}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {nextSlot.start} · {nextSlot.placeLabel}
                    </p>
                  </CardContent>
                </Card>
              )
            )}
            {home.corrections.length > 0 && (
              <Card>
                <SheetHead title="À corriger" href="/dashboard/teacher/notes" linkLabel="Tout voir" />
                <CardContent className="flex flex-col gap-0">
                  {home.corrections.map((task) => {
                    const pending = task.total - task.graded;
                    return (
                      <div key={task.id} className="grid grid-cols-[1.25rem_1fr_auto] items-start gap-3.5 border-t border-border py-3.5 first:border-t-0">
                        <span className="mt-0.5 size-5 rounded-full border-[1.7px] border-progress-edge" />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-[13.5px] text-muted-foreground">{classLabel(task.className)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium tabular-nums">{pending}/{task.total}</p>
                          {task.late > 0 && <p className="text-[12.5px] text-now-ink">{task.late} en retard</p>}
                        </div>
                      </div>
                    );
                  })}
                  {absenceAlert.length >= 2 && (
                    <Callout
                      className="mt-2"
                      title={`${absenceAlert.length} absences sans justificatif`}
                      action={<Link href="/dashboard/teacher/presences">Relancer</Link>}
                    >
                      {absenceAlert.map((flag) => flag.student.split(' ')[0]).join(', ')} · {classLabel(absenceAlert[0].className)}
                    </Callout>
                  )}
                </CardContent>
              </Card>
            )}
            <Card>
              <SheetHead
                title="Programme"
                meta={home.termName ? <span className="text-sm text-muted-foreground">{home.termName}</span> : undefined}
                href="/dashboard/teacher/classes"
                linkLabel="Détail"
              />
              <CardContent>
                {home.programme.map((row, index) => {
                  const ahead = row.covered - row.expected;
                  const pace =
                    ahead > 0
                      ? `${ahead} notion${ahead > 1 ? 's' : ''} d'avance`
                      : ahead < 0
                        ? `${-ahead} notion${ahead < -1 ? 's' : ''} de retard`
                        : 'Au rythme';
                  return (
                    <div key={`${row.classId}:${row.subjectId}`} className="border-t border-border py-3.5 first:border-t-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <Link href={classSpaceHref(row.classId, row.subjectId)} className="font-medium hover:text-progress-ink">
                          {classLabel(row.className)}
                        </Link>
                        <span className={cn('text-[13.5px] font-medium', ahead < 0 ? 'text-now-ink' : 'text-progress-ink')}>
                          {pace}
                        </span>
                      </div>
                      <Progress
                        className="my-2.5 h-2"
                        glow={index === 0}
                        label={`${classLabel(row.className)} : ${row.covered} notions sur ${row.total}`}
                        value={row.total ? (row.covered / row.total) * 100 : 0}
                        expected={row.total ? (row.expected / row.total) * 100 : 0}
                      />
                      <p className="text-[13.5px] text-muted-foreground">
                        {row.chapter} · {row.covered} sur {row.total}
                      </p>
                    </div>
                  );
                })}
                {home.week && (
                  <p className="mt-1 flex items-center gap-2 pt-2.5 text-[13px] text-muted-foreground">
                    <span className="h-3.5 w-0.5 rounded-full bg-ink-2" />
                    {`Notions attendues à la semaine ${home.week} sur ${home.weeks}`}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
