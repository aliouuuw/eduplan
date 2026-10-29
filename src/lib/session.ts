import 'server-only';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import type { Role } from '@/lib/navigation';

export type Viewer = { userId: string; name: string; role: Role; schoolId: string | null };
export type SchoolViewer = Viewer & { schoolId: string };

async function currentViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    name: session.user.name ?? '',
    role: session.user.role as Role,
    schoolId: session.user.schoolId ?? null,
  };
}

/** Role layouts: the signed-in user in one of `roles`, school or not. Otherwise redirect to their own home. */
export async function requireRole(...roles: Role[]): Promise<Viewer> {
  const viewer = await currentViewer();
  if (!viewer) redirect('/login');
  if (!roles.includes(viewer.role)) redirect('/dashboard');
  return viewer;
}

/** Pages: the signed-in user in one of `roles`, attached to a school. Otherwise redirect. */
export async function requireSchoolRole(...roles: Role[]): Promise<SchoolViewer> {
  const viewer = await currentViewer();
  if (!viewer) redirect('/login');
  if (!roles.includes(viewer.role) || !viewer.schoolId) redirect('/dashboard');
  return viewer as SchoolViewer;
}

/** Server actions: same check, but returns null so the action can answer with an error instead of redirecting. */
export async function schoolViewerFor(...roles: Role[]): Promise<SchoolViewer | null> {
  const viewer = await currentViewer();
  if (!viewer || !roles.includes(viewer.role) || !viewer.schoolId) return null;
  return viewer as SchoolViewer;
}
