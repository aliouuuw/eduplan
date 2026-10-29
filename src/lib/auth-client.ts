'use client';

import { createAuthClient } from '@neondatabase/auth/next';

// Browser side of Neon Auth (D49): calls go through our /api/auth route.
export const authClient = createAuthClient();
