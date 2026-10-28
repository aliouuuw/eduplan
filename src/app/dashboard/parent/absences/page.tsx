import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Absences · EduPlan' };

export default function ParentAbsencesPage() {
  return <PendingScreen title="Absences" will="Les absences et retards, et la justification en deux étapes." home="/dashboard/parent" />;
}
