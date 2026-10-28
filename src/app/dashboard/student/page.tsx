import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Accueil · EduPlan' };

export default function StudentPage() {
  return <PendingScreen title="Accueil" will="Ce qui est à faire, et pour quand." home="/dashboard/student" />;
}
