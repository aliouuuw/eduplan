import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Notes · EduPlan' };

export default function ParentNotesPage() {
  return <PendingScreen title="Notes" will="Les notes de votre enfant, matière par matière." home="/dashboard/parent" />;
}
