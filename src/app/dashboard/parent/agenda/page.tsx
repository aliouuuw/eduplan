import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Emploi du temps · EduPlan' };

export default function ParentAgendaPage() {
  return <PendingScreen title="Emploi du temps" will="Les cours de la semaine de votre enfant." home="/dashboard/parent" />;
}
