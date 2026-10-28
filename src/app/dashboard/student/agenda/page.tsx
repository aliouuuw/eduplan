import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Emploi du temps · EduPlan' };

export default function StudentAgendaPage() {
  return <PendingScreen title="Emploi du temps" will="Vos cours de la semaine." home="/dashboard/student" />;
}
