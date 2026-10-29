'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { Session } from '@/lib/auth';

// The dashboard layout reads the session once on the server and hands it down (D49).
// Same `{ data }` shape as next-auth's useSession, so the legacy pages only changed their import.
const SessionContext = createContext<Session | null>(null);

export default function AuthSessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession() {
  return { data: useContext(SessionContext) };
}
