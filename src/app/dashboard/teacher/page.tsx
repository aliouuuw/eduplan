import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Stat } from '@/components/ui/stat';
import { getTeacherHome } from '@/lib/data/teacher-home';
import { db } from '@/lib/db';
import { classLabel, formatDay, frSpaces } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';

export default async function TeacherHomePage() {
  const viewer = await requireSchoolRole('teacher');
  const now = new Date();
  const home = await getTeacherHome(db, viewer.userId, viewer.schoolId, now);
  const first = viewer.name.split(' ')[0] || viewer.name;
  const subtitle = home.week
    ? frSpaces(`${formatDay(now)} · trimestre 1, semaine ${home.week} sur ${home.weeks}`)
    : formatDay(now);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Bonjour, ${first}`} subtitle={subtitle} />
      {home.programme.length === 0 && home.flags.length === 0 ? (
        <EmptyState title="Aucun cours pour l'instant">
          L'administration vous assigne une classe et une matière. Les copies, le programme et les élèves à suivre s'affichent ici.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
            <Card>
              <CardHeader>
                <CardTitle>Programme</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {home.programme.map((row) => {
                  const ahead = row.covered - row.expected;
                  const pace = ahead > 0 ? `${ahead} notion d'avance` : ahead < 0 ? `${-ahead} notion${ahead < -1 ? 's' : ''} de retard` : 'Au rythme';
                  return (
                    <div key={row.classId}>
                      <div className="flex items-baseline justify-between gap-3">
                        <b className="font-display">{classLabel(row.className)}</b>
                        <span className={ahead < 0 ? 'text-now-ink' : 'text-progress-ink'}>{pace}</span>
                      </div>
                      <Progress
                        className="mt-2"
                        label={`${classLabel(row.className)} : ${row.covered} notions sur ${row.total}`}
                        value={row.total ? (row.covered / row.total) * 100 : 0}
                        expected={row.total ? (row.expected / row.total) * 100 : 0}
                      />
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {row.chapter} · {row.covered} sur {row.total}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Élèves à suivre</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {home.flags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun signal pour l'instant.</p>
              ) : (
                home.flags.map((flag) => (
                  <div key={flag.id} className="border-b border-border pb-3 last:border-0">
                    <div className="font-medium">{flag.student}</div>
                    <div className="text-sm text-muted-foreground">{classLabel(flag.className)}</div>
                    <p className="mt-1 text-sm">{flag.reason}</p>
                    <p className="text-xs text-muted-foreground">{flag.source === 'rule' ? "Règle de l'école" : 'Ajouté par vous'}</p>
                  </div>
                ))
              )}
              <Link href="/dashboard/teacher/classes" className="text-sm font-medium text-progress-ink">
                Ouvrir les classes
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
