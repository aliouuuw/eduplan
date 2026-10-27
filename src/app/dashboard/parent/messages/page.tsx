import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Messages · EduPlan' };

export default function ParentMessagesPage() {
  return <PendingScreen title="Messages" will="Les échanges avec les enseignants de votre enfant." home="/dashboard/parent" />;
}
