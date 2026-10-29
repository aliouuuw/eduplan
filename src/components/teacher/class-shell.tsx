import type { ReactNode } from 'react';
import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { classLabel, frSpaces } from '@/lib/fr';
import { cn } from '@/lib/utils';

const TABS = [
  { slug: 'travail', label: 'Travail', soon: true },
  { slug: 'programme', label: 'Programme' },
  { slug: 'eleves', label: 'Élèves', soon: true },
  { slug: 'notes', label: 'Notes' },
  { slug: 'presences', label: 'Présences', soon: true },
  { slug: 'emploi-du-temps', label: 'Emploi du temps', soon: true },
] as const;

export function ClassShell({
  classId,
  subjectId,
  className,
  subjectName,
  studentCount,
  roomLabel,
  termName,
  week,
  weeks,
  active,
  children,
}: {
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
  studentCount: number;
  roomLabel: string | null;
  termName: string | null;
  week: number | null;
  weeks: number;
  active: string;
  children: ReactNode;
}) {
  const meta = [
    `${studentCount} élèves`,
    roomLabel,
    termName && week ? `${termName.toLowerCase()}, semaine ${week} sur ${weeks}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumb={{ href: '/dashboard/teacher/classes', label: 'Mes classes' }}
        title={`${classLabel(className)} · ${subjectName}`}
        subtitle={frSpaces(meta)}
      />
      <nav className="flex w-max max-w-full gap-1 overflow-x-auto rounded-[26px] bg-card/55 p-1" aria-label="Espace de la classe">
        {TABS.map((tab) => {
          const on = tab.slug === active;
          const soon = 'soon' in tab && tab.soon;
          const href = soon ? '#' : `/dashboard/teacher/classes/${classId}/${subjectId}/${tab.slug}`;
          return (
            <Link
              key={tab.slug}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex h-10 shrink-0 items-center gap-2 rounded-[20px] px-[18px] text-[14.5px] font-medium transition-colors',
                on ? 'bg-card text-foreground shadow-tab' : 'text-ink-2 hover:bg-card/70 hover:text-foreground',
                soon && !on && 'pointer-events-none opacity-50',
              )}
            >
              {tab.label}
              {tab.slug === 'eleves' && <span className="text-[12.5px] font-normal text-muted-foreground">{studentCount}</span>}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
