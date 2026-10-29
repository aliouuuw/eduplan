import { ReactNode } from 'react';

import { SectionNav } from '@/components/layout/section-nav';
import { TEACHER_SECTIONS } from '@/lib/navigation';
import { requireRole } from '@/lib/session';

// Agenda holds the timetable and the availability page; the tabs switch between them.
export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireRole('teacher');
  return (
    <>
      <SectionNav sections={TEACHER_SECTIONS} />
      {children}
    </>
  );
}
