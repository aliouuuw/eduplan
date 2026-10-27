import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Travail · EduPlan' };

export default function ParentTravailPage() {
  return <PendingScreen title="Travail" will="Les devoirs à rendre et ceux qui manquent." home="/dashboard/parent" />;
}
