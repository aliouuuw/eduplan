import { ReactNode } from 'react';

import { SectionNav } from '@/components/layout/section-nav';
import { TEACHER_SECTIONS } from '@/lib/navigation';

// Agenda holds the timetable and the availability page; the tabs switch between them.
export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionNav sections={TEACHER_SECTIONS} />
      {children}
    </>
  );
}
