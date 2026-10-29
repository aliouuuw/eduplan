import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { AccountMenu } from '@/components/layout/account-menu';
import { AppDock } from '@/components/layout/app-dock';
import AuthSessionProvider from '@/components/providers/session-provider';
import { auth } from '@/lib/auth';
import { NAV, ROLE_LABEL, type Role } from '@/lib/navigation';

// The app shell for every role: A+ dock on the left (bottom tab bar on phones), content on the ground.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role as Role;
  const items = NAV[role] ?? [];
  const account = (
    <AccountMenu name={session.user.name ?? 'Compte'} email={session.user.email} roleLabel={ROLE_LABEL[role] ?? role} />
  );

  return (
    <AuthSessionProvider session={session}>
    <div className="flex min-h-screen gap-4 md:gap-7 md:pl-5">
      <AppDock items={items} end={account} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between px-5 pt-4 md:hidden">
          <span className="grid size-9 place-items-center rounded-[12px] fill-primary font-display text-primary-foreground">e</span>
          {account}
        </div>
        <main className="mx-auto max-w-[1280px] px-5 pt-6 pb-28 md:px-8 md:pt-7 md:pb-10">{children}</main>
      </div>
    </div>
    </AuthSessionProvider>
  );
}
