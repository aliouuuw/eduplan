import { ReactNode } from 'react';

import { requireRole } from '@/lib/session';

export default async function StudentLayout({ children }: { children: ReactNode }) {
  await requireRole('student');
  return children;
}
