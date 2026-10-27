import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Carnet de notes · EduPlan' };

export default function TeacherNotesPage() {
  return <PendingScreen title="Carnet de notes" will="Les notes de vos classes sur 20, avec les coefficients et la moyenne du trimestre." home="/dashboard/teacher" />;
}
