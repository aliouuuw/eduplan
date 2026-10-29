import { neonAuth } from '@/lib/neon-auth';

// Neon Auth endpoints (sign-in, sign-out, password reset), proxied to the managed service (D49).
const { GET, POST: forward } = neonAuth.handler();

// Accounts come from invitations only (/api/invitations/accept signs up on the server), so public
// sign-up stays closed here. Neon's own URL still accepts it; the accept route handles a login taken that way.
async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path[0] === 'sign-up') return Response.json({ message: 'Sign-up is by invitation only.' }, { status: 403 });
  return forward(request, context);
}

export { GET, POST };
