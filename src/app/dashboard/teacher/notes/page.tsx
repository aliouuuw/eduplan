import { CalendarX, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow, ListRows } from '@/components/ui/list-row';
import { listTermWork } from '@/lib/data/grading';
import { schoolDate } from '@/lib/data/teacher-home-math';
import { db } from '@/lib/db';
import { classLabel, formatDay } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Carnet de notes · EduPlan' };

const PAGE = '/dashboard/teacher/notes';

export default async function TeacherNotesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const viewer = await requireSchoolRole('teacher');
  const { term: termParam } = await searchParams;
  const { context, works } = await listTermWork(db, viewer.userId, viewer.schoolId, {
    day: schoolDate(new Date()),
    termId: typeof termParam === 'string' ? termParam : null,
  });
  const { year, term, terms, editable } = context;

  if (!year || !term) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Carnet de notes" />
        <Card>
          <EmptyState icon={<CalendarX />} title="Pas d'année scolaire en cours">
            L&apos;administration crée l&apos;année et ses trimestres dans Réglages. Vos devoirs apparaîtront ici ensuite.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Carnet de notes"
        subtitle={`${term.name} · ${year.name}${editable ? '' : ' · clôturé, lecture seule'}`}
      />

      {/* Links, not client state: the trimestre lives in the URL (D41). */}
      <nav aria-label="Trimestres" className="flex flex-wrap gap-1.5">
        {terms.map((t) => (
          <Link
            key={t.id}
            href={`${PAGE}?term=${t.id}`}
            aria-current={t.id === term.id ? 'page' : undefined}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
              t.id === term.id && 'bg-progress-soft text-progress-ink hover:text-progress-ink',
            )}
          >
            {t.name}
          </Link>
        ))}
      </nav>

      <Card>
        <CardContent>
          {works.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck />}
              title="Aucun devoir noté ce trimestre"
              action={
                <Button asChild variant="secondary">
                  <Link href="/dashboard/teacher/classes">Voir mes classes</Link>
                </Button>
              }
            >
              Les devoirs et contrôles de vos classes, datés dans ce trimestre, apparaîtront ici.
            </EmptyState>
          ) : (
            <ListRows>
              {works.map((work) => (
                <Link key={work.id} href={`${PAGE}/${work.id}`} className="-mx-3 block rounded-xl px-3 transition-colors hover:bg-progress-faint">
                  <ListRow
                    title={work.title}
                    meta={`${classLabel(work.className)} · ${work.subjectName} · coef. ${work.coefficient} · ${formatDay(new Date(work.day))}`}
                    trailing={work.toGrade > 0 ? `${work.toGrade} à corriger` : 'Tout corrigé'}
                    trailingMeta={`${work.graded} corrigée${work.graded > 1 ? 's' : ''} sur ${work.total}`}
                  />
                </Link>
              ))}
            </ListRows>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
