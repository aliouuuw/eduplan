import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Présences · EduPlan' };

export default function TeacherPresencesPage() {
  return <PendingScreen title="Présences" will="Les appels de chaque cours et les absences à justifier." home="/dashboard/teacher" />;
}
