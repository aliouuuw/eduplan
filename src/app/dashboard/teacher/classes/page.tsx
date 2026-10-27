import Link from 'next/link';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow, ListRows } from '@/components/ui/list-row';
import { listTeacherClasses } from '@/lib/data/teacher-classes';
import { db } from '@/lib/db';
import { classLabel } from '@/lib/fr';
import { requireSchoolRole } from '@/lib/session';

export const metadata = { title: 'Classes · EduPlan' };

export default async function TeacherClassesPage() {
  const viewer = await requireSchoolRole('teacher');
  const rows = await listTeacherClasses(db, viewer.userId, viewer.schoolId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mes classes" subtitle="Ouvrez une classe pour le programme, les élèves et les notes." />
      {rows.length === 0 ? (
        <EmptyState title="Aucune classe assignée">L'administration vous assigne une classe et une matière.</EmptyState>
      ) : (
        <Card>
          <CardContent>
            <ListRows>
              {rows.map((row) => (
                <ListRow
                  key={row.classId}
                  title={classLabel(row.className)}
                  meta={`${row.subjectName} · ${row.studentCount} élèves`}
                  trailing={<Link href={`/dashboard/teacher/classes/${row.classId}/programme`} className="text-sm font-medium text-progress-ink">Programme</Link>}
                />
              ))}
            </ListRows>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
