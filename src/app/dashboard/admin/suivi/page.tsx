import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Suivi · EduPlan' };

export default function AdminSuiviPage() {
  return <PendingScreen title="Suivi" will="Les présences et les notes de toute l'école, et ce qui manque." home="/dashboard/admin" />;
}
