import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Réglages · EduPlan' };

export default function AdminParametresPage() {
  return <PendingScreen title="Réglages" will="L'année scolaire, les trimestres et les règles de suivi des élèves." home="/dashboard/admin" />;
}
