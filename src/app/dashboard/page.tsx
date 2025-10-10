import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Redirect to role-specific dashboard
  const roleRoutes = {
    superadmin: '/dashboard/superadmin',
    admin: '/dashboard/admin',
    teacher: '/dashboard/teacher',
    parent: '/dashboard/parent',
    student: '/dashboard/student',
  };

  const defaultRoute = roleRoutes[session.user.role as keyof typeof roleRoutes];
  
  if (defaultRoute) {
    redirect(defaultRoute);
  }

  // Fallback if role is not recognized
  redirect('/login');
}

