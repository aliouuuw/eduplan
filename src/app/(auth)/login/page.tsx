import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { LoginForm } from './login-form';

// Signed in already: straight to the role's home, not a second sign-in.
export default async function LoginPage() {
  if (await auth()) redirect('/dashboard');
  return <LoginForm />;
}
