import { PendingScreen } from '@/components/layout/pending-screen';

export const metadata = { title: 'Messages · EduPlan' };

export default function TeacherMessagesPage() {
  return <PendingScreen title="Messages" will="Les échanges avec les familles, un fil par élève." home="/dashboard/teacher" />;
}
