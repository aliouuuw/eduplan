import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Notes · EduPlan' };

export default function StudentNotesPage() {
  return <PendingScreen title="Notes" will="Vos notes sur 20 et les commentaires de vos enseignants." home="/dashboard/student" />;
}
