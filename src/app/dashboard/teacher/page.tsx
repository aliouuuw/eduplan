import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Clock } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Stat } from '@/components/ui/stat';
import { getTeacherHome, type HomeSlot } from '@/lib/data/teacher-home';
import { db } from '@/lib/db';
import { classLabel, formatDay, frSpaces } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';
import { cn } from '@/lib/utils';

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

function placeOf(room: string) {
  const place = room.split(' · ')[0] ?? room;
  return place.replace(/^Salle/, 'salle');
}

function topicOf(room: string) {
  return room.split(' · ')[1] ?? '';
}

function SlotCard({ slot }: { slot: HomeSlot }) {
  const live = slot.state === 'live';
  const called = slot.state === 'done' && slot.absents > 0;
  return (
    <div
      className={cn(
        'flex min-h-[150px] flex-col gap-0.5 rounded-[20px] p-4 transition-colors',
        live ? 'wash-slot' : 'hover:bg-progress-faint',
      )}
    >
      <time className={cn('text-[13px]', live ? 'text-now-ink' : 'text-muted-foreground')}>
        {slot.start} · {slot.end}
      </time>
      <h3 className="font-display mt-1.5 text-xl">{classLabel(slot.className)}</h3>
      <p className={cn('text-[13.5px]', live ? 'text-now-ink' : 'text-ink-2')}>{slot.room}</p>
      {live && (
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-[13px] text-now-ink">
          <Clock className="size-[15px]" />
          En cours
        </span>
      )}
      {called && (
        <span className="mt-auto flex items-center gap-1.5 pt-3 text-[13px] text-muted-foreground">
          <Check className="size-[15px] text-progress-ink" />
          {`Appel fait · ${slot.absents} absent${slot.absents > 1 ? 's' : ''}`}
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
  const subtitle = home.week
    ? frSpaces(`${formatDay(now)} · trimestre 1, semaine ${home.week} sur ${home.weeks}`)
    : formatDay(now);
  const live = home.slots.find((slot) => slot.state === 'live');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Bonjour, ${first}`} subtitle={subtitle} />
      {home.programme.length === 0 && home.flags.length === 0 ? (
        <EmptyState title="Aucun cours pour l'instant">
          L'administration vous assigne une classe et une matière. Les copies, le programme et les élèves à suivre s'affichent ici.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_392px]">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardContent>
                  <Stat label="Notes saisies pour le conseil" value={home.gradesEntered} unit="notes" caption="Notes du trimestre en cours" />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Stat label="Copies à corriger" value={home.copiesToGrade} unit="copies" caption="Devoirs rendus, pas encore notés" />
                </CardContent>
              </Card>
            </div>
            <Card className="@container">
              <div className="flex items-center gap-3 px-7">
                <CardTitle>Cours d'aujourd'hui</CardTitle>
                <SheetLink href="/dashboard/teacher/timetable">Emploi du temps</SheetLink>
              </div>
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
              <div className="flex items-center gap-3 px-7">
                <CardTitle>Élèves à suivre</CardTitle>
                <span className="text-sm text-muted-foreground">{home.flags.length}</span>
                <SheetLink href="/dashboard/teacher/classes">Tout voir</SheetLink>
              </div>
              <CardContent>
                {home.flags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun signal pour l'instant.</p>
                ) : (
                  home.flags.map((flag) => (
                    <div
                      key={flag.id}
                      className="grid items-baseline gap-1 border-t border-border py-3.5 first:border-t-0 sm:grid-cols-[11rem_1fr_auto] sm:gap-x-5"
                    >
                      <div>
                        <p className="font-medium">{flag.student}</p>
                        <p className="text-[13.5px] text-muted-foreground">{classLabel(flag.className)}</p>
                      </div>
                      <p className="text-ink-2">{flag.reason}</p>
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
            {live && (
              <Card className="wash-now">
                <CardContent className="flex flex-col">
                  <p className="flex items-center gap-2 text-sm font-medium text-now-ink">
                    <span className="size-2 rounded-full bg-now shadow-glow-now" />
                    {`En cours depuis ${live.start}`}
                  </p>
                  <h2 className="font-display mt-3 text-[32px] leading-[1.15]">
                    {`${classLabel(live.className)}, ${placeOf(live.room)}`}
                  </h2>
                  {topicOf(live.room) && <p className="mt-1 text-muted-foreground">{topicOf(live.room)}</p>}
                  <Button asChild size="sm" className="mt-5 w-fit">
                    <Link href="/dashboard/teacher/presences">
                      <Check />
                      Faire l'appel
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            <Card>
              <div className="flex items-center gap-3 px-7">
                <CardTitle>Programme</CardTitle>
                <span className="text-sm text-muted-foreground">Trimestre 1</span>
                <SheetLink href="/dashboard/teacher/classes">Détail</SheetLink>
              </div>
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
                    <div key={row.classId} className="border-t border-border py-3.5 first:border-t-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <b className="font-medium">{classLabel(row.className)}</b>
                        <span className={cn('text-[13.5px] font-medium', ahead < 0 ? 'text-now-ink' : 'text-progress-ink')}>
                          {pace}
                        </span>
                      </div>
                      <Progress
                        className="my-2.5"
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
