import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="soft-wash min-h-screen">
      <DashboardSidebar user={session.user} />

      <div className="lg:pl-[284px]">
        <main className="min-h-screen">
          <div className="mx-auto max-w-7xl px-6 py-8 pb-10 sm:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

