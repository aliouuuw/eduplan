import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Mes matières · EduPlan' };

export default function StudentMatieresPage() {
  return <PendingScreen title="Mes matières" will="Les cours, documents et devoirs de chaque matière." home="/dashboard/student" />;
}
