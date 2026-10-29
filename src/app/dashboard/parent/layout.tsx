import { ReactNode } from 'react';

import { requireRole } from '@/lib/session';

export default async function ParentLayout({ children }: { children: ReactNode }) {
  await requireRole('parent');
  return children;
}
