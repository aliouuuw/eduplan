import { neonAuth } from '@/lib/neon-auth';

// Neon Auth endpoints (sign-in, sign-out, password reset), proxied to the managed service (D49).
export const { GET, POST } = neonAuth.handler();
