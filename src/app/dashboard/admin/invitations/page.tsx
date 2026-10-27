import { MailPlus } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow, ListRows } from '@/components/ui/list-row';
import { Stat } from '@/components/ui/stat';
import { invitationStatus, listInvitations, type InvitationStatus } from '@/lib/data/invitations';
import { db } from '@/lib/db';
import { formatDay } from '@/lib/fr';
import { getInvitationLink } from '@/lib/invitations';
import { ROLE_LABEL } from '@/lib/navigation';
import { requireSchoolRole } from '@/lib/session';
import { InvitationActions } from './invitation-actions';
import { NewInvitation } from './new-invitation';

export const metadata = { title: 'Invitations · EduPlan' };

const STATUS: Record<InvitationStatus, { label: string; heading: string; tone?: 'now' | 'progress' }> = {
  en_attente: { label: 'En attente', heading: 'En attente', tone: 'progress' },
  acceptee: { label: 'Acceptée', heading: 'Acceptées' },
  expiree: { label: 'Expirée', heading: 'Expirées', tone: 'now' },
};

// Reference page for the data pattern (APP_BUILD_PLAN phase 2): a server component reads through
// src/lib/data, writes go through ./actions.ts, and only the interactive bits are client islands.
export default async function InvitationsPage() {
  const viewer = await requireSchoolRole('admin');
  const now = new Date();
  const rows = (await listInvitations(db, viewer.schoolId)).map((inv) => ({ ...inv, status: invitationStatus(inv, now) }));
  const count = (s: InvitationStatus) => rows.filter((r) => r.status === s).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invitations"
        subtitle="Invitez enseignants, parents et élèves à rejoindre l'école."
        actions={rows.length > 0 && <NewInvitation />}
      />

      <div className="grid gap-6 sm:grid-cols-3">
        {(['en_attente', 'acceptee', 'expiree'] as const).map((s) => (
          <Card key={s}>
            <CardContent>
              <Stat label={STATUS[s].heading} value={count(s)} unit={count(s) > 1 ? 'invitations' : 'invitation'} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<MailPlus />} title="Aucune invitation pour l'instant" action={<NewInvitation />}>
            Invitez les enseignants de l&apos;école : ils recevront un lien pour créer leur compte.
          </EmptyState>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Toutes les invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <ListRows>
                {rows.map((inv) => (
                  <div key={inv.id} className="flex flex-wrap items-center gap-x-4">
                    <ListRow
                      className="min-w-0 flex-1"
                      title={inv.email}
                      meta={`${ROLE_LABEL[inv.role]} · envoyée le ${formatDay(inv.createdAt)} · ${
                        inv.usedAt ? `acceptée le ${formatDay(inv.usedAt)}` : `expire le ${formatDay(inv.expiresAt)}`
                      }`}
                      trailingMeta={STATUS[inv.status].label}
                      trailingTone={STATUS[inv.status].tone}
                    />
                    <InvitationActions
                      id={inv.id}
                      email={inv.email}
                      link={inv.status === 'en_attente' ? getInvitationLink(inv.token) : null}
                      canDelete={inv.status !== 'acceptee'}
                    />
                  </div>
                ))}
              </ListRows>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
