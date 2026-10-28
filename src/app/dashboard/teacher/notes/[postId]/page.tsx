import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/layout/page-header';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { getCorrection, type Copy } from '@/lib/data/grading';
import { db } from '@/lib/db';
import { classLabel, formatDay } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';
import { cn } from '@/lib/utils';
import { GradeForm } from './grade-form';

export const metadata = { title: 'Correction · EduPlan' };

// French: 0 and 1 take the singular.
const corrected = (n: number) => `${n} corrigée${n > 1 ? 's' : ''}`;
const grade = (value: number) => String(value).replace('.', ',');
const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });

export default async function CorrectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { postId } = await params;
  const { copy: copyParam } = await searchParams;
  const viewer = await requireSchoolRole('teacher');
  const view = await getCorrection(db, viewer.userId, viewer.schoolId, postId);
  if (!view) notFound();

  const { post, copies, max, editable, term } = view;
  const toGrade = copies.filter((c) => c.status === 'submitted' || c.status === 'late');
  const graded = copies.filter((c) => c.status === 'returned');
  const missing = copies.filter((c) => c.status === 'assigned');
  const paper = post.assignmentFormat === 'paper';
  const current = copies.find((c) => c.id === copyParam) ?? toGrade[0] ?? copies[0];
  // Next = the following copy still to grade, wrapping to the top of the list.
  const queue = toGrade.filter((c) => c.id !== current?.id);
  const after = toGrade.findIndex((c) => c.id === current?.id);
  const nextCopy = queue.find((c) => toGrade.indexOf(c) > after) ?? queue[0];
  const href = (c: Copy) => `/dashboard/teacher/notes/${postId}?copy=${c.id}`;

  const groups = [
    { label: 'À corriger', rows: toGrade },
    { label: 'Corrigées', rows: graded },
    { label: paper ? 'Sans note' : 'Pas encore rendues', rows: missing },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumb={{ href: `/dashboard/teacher/notes${term ? `?term=${term.id}` : ''}`, label: 'Carnet de notes' }}
        title={post.title}
        subtitle={[
          classLabel(view.className),
          view.subjectName,
          `coef. ${post.coefficient}`,
          post.dueAt ? `à rendre le ${formatDay(post.dueAt)}` : paper ? 'contrôle en classe' : null,
        ].filter(Boolean).join(' · ')}
      />
      <div className="-mt-2 flex max-w-sm items-center gap-3">
        <Progress value={copies.length ? (graded.length / copies.length) * 100 : 0} label="Copies corrigées" />
        <p className="shrink-0 text-sm text-muted-foreground">{corrected(graded.length)} sur {copies.length}</p>
      </div>

      {!editable && (
        <Callout title={term ? `${term.name} est clôturé` : "Ce devoir n'est dans aucun trimestre"}>
          {term ? 'Les notes restent visibles mais ne peuvent plus changer.' : 'Sa date tombe hors des trimestres de l’année : demandez à l’administration de vérifier les dates.'}
        </Callout>
      )}

      {!current ? (
        <Card>
          <EmptyState title="Aucune copie pour ce devoir">Les élèves inscrits dans la classe auront une copie à la publication.</EmptyState>
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr_340px]">
          <Card className="order-3 lg:order-1">
            <CardContent>
              <CardTitle className="text-base">Copies</CardTitle>
              <nav aria-label="Copies des élèves">
                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="mt-4 mb-1.5 px-3 text-[13px] text-muted-foreground">{group.label} · {group.rows.length}</p>
                    <ul>
                      {group.rows.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={href(c)}
                            aria-current={c.id === current.id ? 'page' : undefined}
                            className={cn(
                              'flex items-baseline justify-between gap-3 rounded-[14px] px-3 py-2.5 text-[14.5px] transition-colors hover:bg-progress-faint',
                              c.id === current.id && 'bg-progress-soft',
                              c.status === 'assigned' && 'text-muted-foreground',
                            )}
                          >
                            <span className="min-w-0 truncate">{c.student}</span>
                            <small className={cn('shrink-0 text-[12.5px] text-muted-foreground', c.status === 'late' && 'text-now-ink')}>
                              {c.status === 'returned' && c.grade !== null
                                ? <b className="font-medium text-foreground tabular-nums">{grade(c.grade)}</b>
                                : c.status === 'late' ? 'en retard'
                                : c.submittedAt && !paper ? formatDay(c.submittedAt).replace(/ \d{4}$/, '') : null}
                            </small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </CardContent>
          </Card>

          <Card className="order-2">
            <CardContent>
              <h2 className="font-display text-2xl tracking-tight">{current.student}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {paper
                  ? 'Contrôle sur papier : saisissez la note de la copie.'
                  : current.submittedAt
                    ? `Rendu en ligne le ${formatDay(current.submittedAt)} à ${time.format(current.submittedAt)}${current.status === 'late' ? ' · en retard' : ''}`
                    : 'Pas encore rendu.'}
              </p>
              {current.body ? (
                <p className="mt-6 border-t border-border pt-5 text-[15.5px] leading-relaxed whitespace-pre-wrap">{current.body}</p>
              ) : (
                !paper && current.submittedAt && (
                  <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">La copie ne contient pas de texte.</p>
                )
              )}
            </CardContent>
          </Card>

          <Card className="order-1 lg:order-3">
            <CardContent>
              {editable ? (
                <GradeForm
                  key={current.id}
                  submissionId={current.id}
                  student={current.student}
                  max={max}
                  grade={current.grade}
                  comment={current.comment}
                  next={nextCopy ? { href: href(nextCopy), student: nextCopy.student } : null}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">Note sur {max}</p>
                  <p className="font-display text-[56px] leading-none tracking-[-0.04em] tabular-nums">
                    {current.grade === null ? '–' : grade(current.grade)}
                  </p>
                  {current.comment && <p className="text-[14.5px] whitespace-pre-wrap">{current.comment}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
