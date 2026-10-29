import { createNeonAuth } from '@neondatabase/auth/next/server';

// Managed Better Auth on Neon (D49). Only this file, auth-client.ts, the /api/auth route and proxy.ts
// import the SDK: leaving Neon Auth means replacing these four, not the callers of auth().
export const neonAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
