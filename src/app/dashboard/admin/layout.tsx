import { ReactNode } from 'react';

import { SectionNav } from '@/components/layout/section-nav';
import { ADMIN_SECTIONS } from '@/lib/navigation';
import { requireRole } from '@/lib/session';

// Admin sections hold several pages; the tabs under the dock item switch between them.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole('admin');
  return (
    <>
      <SectionNav sections={ADMIN_SECTIONS} />
      {children}
    </>
  );
}
