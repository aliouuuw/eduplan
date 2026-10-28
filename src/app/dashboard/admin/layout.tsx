import { ReactNode } from 'react';

import { SectionNav } from '@/components/layout/section-nav';
import { ADMIN_SECTIONS } from '@/lib/navigation';

// Admin sections hold several pages; the tabs under the dock item switch between them.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionNav sections={ADMIN_SECTIONS} />
      {children}
    </>
  );
}
