import { ReactNode } from 'react';

import { requireRole } from '@/lib/session';

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  await requireRole('superadmin');
  return children;
}
