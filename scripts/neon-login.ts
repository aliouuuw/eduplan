// Seeds a Neon Auth login and returns its id, for scripts that run outside Next (D49).
// Signs up, or signs in when the email already has a login. The Origin must be a trusted domain
// in Neon Console > Auth (localhost is trusted in development).
export async function ensureLogin(email: string, name: string, password: string): Promise<string> {
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) throw new Error('NEON_AUTH_BASE_URL is not set');
  const call = (path: string, body: object) =>
    fetch(new URL(path, base.endsWith('/') ? base : `${base}/`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: process.env.APP_URL ?? 'http://localhost:3000' },
      body: JSON.stringify(body),
    });

  let res = await call('sign-up/email', { email, name, password });
  if (!res.ok) res = await call('sign-in/email', { email, password });
  if (!res.ok) throw new Error(`Neon Auth refused ${email}: ${res.status} ${await res.text()}`);
  const { user } = (await res.json()) as { user: { id: string } };
  return user.id;
}

/** The password for seeded logins: SEED_PASSWORD from the environment, never a value written in git. */
export function seedPassword(): string {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) throw new Error('Set SEED_PASSWORD (8+ characters) in .env.local before seeding logins');
  return password;
}
