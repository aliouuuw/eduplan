import { CalendarPlus } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow, ListRows } from '@/components/ui/list-row';
import { listYears } from '@/lib/data/academic-years';
import { db } from '@/lib/db';
import { formatDay } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';
import { NewYear } from './new-year';
import { MakeCurrent, TermClose } from './year-actions';

export const metadata = { title: 'Réglages · EduPlan' };

const span = (from: string, to: string) => `${formatDay(new Date(from))} – ${formatDay(new Date(to))}`;

export default async function AdminParametresPage() {
  const viewer = await requireSchoolRole('admin');
  const years = await listYears(db, viewer.schoolId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Réglages"
        subtitle="Années scolaires et trimestres."
        actions={years.length > 0 && <NewYear />}
      />

      {years.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarPlus />} title="Aucune année scolaire" action={<NewYear />}>
            Créez l&apos;année en cours et ses trimestres : les classes et les pages des enseignants en dépendent.
          </EmptyState>
        </Card>
      ) : (
        years.map((year) => (
          <Card key={year.id}>
            <CardHeader>
              <CardTitle>{year.name}</CardTitle>
              <CardDescription>{span(year.startsOn, year.endsOn)}</CardDescription>
              <CardAction>
                {year.isCurrent ? (
                  <p className="pt-1 text-[13.5px] font-medium text-progress-ink">Année en cours</p>
                ) : (
                  <MakeCurrent id={year.id} name={year.name} />
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              <ListRows>
                {year.terms.map((term) => (
                  <div key={term.id} className="flex flex-wrap items-center gap-x-4">
                    <ListRow
                      className="min-w-0 flex-1 basis-64"
                      title={term.name}
                      meta={span(term.startsOn, term.endsOn)}
                      trailingMeta={term.closedAt ? `Clôturé le ${formatDay(term.closedAt)}` : 'Ouvert'}
                      trailingTone={term.closedAt ? undefined : 'progress'}
                    />
                    <TermClose id={term.id} name={term.name} closed={Boolean(term.closedAt)} />
                  </div>
                ))}
              </ListRows>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
