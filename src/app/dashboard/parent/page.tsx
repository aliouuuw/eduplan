import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Accueil · EduPlan' };

export default function ParentPage() {
  return <PendingScreen title="Accueil" will="Ce qui compte cette semaine pour votre enfant : travail à rendre, notes, absences." home="/dashboard/parent" />;
}
