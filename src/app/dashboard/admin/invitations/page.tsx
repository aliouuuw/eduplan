import { MailPlus, SearchX } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ListRow, ListRows } from '@/components/ui/list-row';
import { Stat } from '@/components/ui/stat';
import { getInvitationPage, INVITATIONS_PAGE_SIZE, invitationStatus, type InvitationStatus } from '@/lib/data/invitations';
import { db } from '@/lib/db';
import { formatDay, frSpaces } from '@/lib/fr';
import { getInvitationLink } from '@/lib/invitations';
import { ROLE_LABEL } from '@/lib/navigation';
import { requireSchoolRole } from '@/lib/session';
import { InvitationActions } from './invitation-actions';
import { NewInvitation } from './new-invitation';

export const metadata = { title: 'Invitations · EduPlan' };

const PAGE = '/dashboard/admin/invitations';

const STATUS: Record<InvitationStatus, { label: string; heading: string; tone?: 'now' | 'progress' }> = {
  en_attente: { label: 'En attente', heading: 'En attente', tone: 'progress' },
  acceptee: { label: 'Acceptée', heading: 'Acceptées' },
  expiree: { label: 'Expirée', heading: 'Expirées', tone: 'now' },
};

/** Keeps the search when moving between pages; page 1 stays out of the URL. */
function pageHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${PAGE}?${query}` : PAGE;
}

// Reference page for the data pattern (APP_BUILD_PLAN phase 2): a server component reads through
// src/lib/data, writes go through ./actions.ts, and only the interactive bits are client islands.
export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const viewer = await requireSchoolRole('admin');
  const params = await searchParams;
  const now = new Date();
  const { rows, totals, total, matched, page, pages, q } = await getInvitationPage(
    db,
    viewer.schoolId,
    { page: params.page, q: params.q },
    now,
  );
  const first = (page - 1) * INVITATIONS_PAGE_SIZE + 1;
  const last = first + rows.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invitations"
        subtitle="Invitez enseignants, parents et élèves à rejoindre l'école."
        actions={total > 0 && <NewInvitation />}
      />

      <div className="grid gap-6 sm:grid-cols-3">
        {(['en_attente', 'acceptee', 'expiree'] as const).map((s) => (
          <Card key={s}>
            <CardContent>
              <Stat label={STATUS[s].heading} value={totals[s]} unit={totals[s] > 1 ? 'invitations' : 'invitation'} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        {total === 0 ? (
          <EmptyState icon={<MailPlus />} title="Aucune invitation pour l'instant" action={<NewInvitation />}>
            Invitez les enseignants de l&apos;école : ils recevront un lien pour créer leur compte.
          </EmptyState>
        ) : (
          <>
            <CardHeader className="gap-4">
              <CardTitle>{q ? frSpaces(`Recherche « ${q} »`) : 'Toutes les invitations'}</CardTitle>
              {/* A plain GET form: a new search drops the page, so it always starts on page 1. */}
              <form role="search" action={PAGE} className="flex flex-wrap gap-2">
                <label htmlFor="invitation-search" className="sr-only">
                  Rechercher une adresse e-mail
                </label>
                <Input
                  key={q}
                  id="invitation-search"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Rechercher une adresse e-mail"
                  maxLength={254}
                  autoComplete="off"
                  className="min-w-0 flex-1 basis-56"
                />
                <Button type="submit" variant="secondary">
                  Rechercher
                </Button>
                {q && (
                  <Button asChild variant="ghost">
                    <Link href={PAGE}>Effacer</Link>
                  </Button>
                )}
              </form>
            </CardHeader>
            <CardContent>
              {matched === 0 ? (
                <EmptyState
                  icon={<SearchX />}
                  title="Aucune adresse ne correspond"
                  action={
                    <Button asChild variant="secondary">
                      <Link href={PAGE}>Voir toutes les invitations</Link>
                    </Button>
                  }
                >
                  {frSpaces(`Aucune des ${total} invitations de l'école ne contient « ${q} ».`)}
                </EmptyState>
              ) : (
                <>
                  <ListRows>
                    {rows.map((inv) => {
                      const status = invitationStatus(inv, now);
                      return (
                        <div key={inv.id} className="flex flex-wrap items-center gap-x-4">
                          <ListRow
                            className="min-w-0 flex-1 basis-64"
                            title={<span className="break-all">{inv.email}</span>}
                            meta={`${ROLE_LABEL[inv.role]} · envoyée le ${formatDay(inv.createdAt)} · ${
                              inv.usedAt ? `acceptée le ${formatDay(inv.usedAt)}` : `expire le ${formatDay(inv.expiresAt)}`
                            }`}
                            trailingMeta={STATUS[status].label}
                            trailingTone={STATUS[status].tone}
                          />
                          <InvitationActions
                            id={inv.id}
                            email={inv.email}
                            link={status === 'en_attente' ? getInvitationLink(inv.token) : null}
                            canDelete={status !== 'acceptee'}
                          />
                        </div>
                      );
                    })}
                  </ListRows>
                  <nav
                    aria-label="Pages des invitations"
                    className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
                  >
                    <p className="text-[13.5px] text-muted-foreground" aria-live="polite">
                      {first}–{last} sur {matched}
                      {q ? (matched > 1 ? ' résultats' : ' résultat') : matched > 1 ? ' invitations' : ' invitation'}
                    </p>
                    {pages > 1 && (
                      <div className="flex items-center gap-2">
                        {page > 1 ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={pageHref(q, page - 1)} rel="prev">Précédente</Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>Précédente</Button>
                        )}
                        <span className="whitespace-nowrap px-1 text-[13.5px] text-ink-2">
                          Page {page} sur {pages}
                        </span>
                        {page < pages ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={pageHref(q, page + 1)} rel="next">Suivante</Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>Suivante</Button>
                        )}
                      </div>
                    )}
                  </nav>
                </>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
