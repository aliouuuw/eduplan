import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { isPublicRoute } from './public-routes';

test('public routes match whole segments only', () => {
  for (const p of ['/', '/login', '/login/', '/reset-password', '/design-system']) expect(isPublicRoute(p)).toBe(true);
  for (const p of ['/dashboard', '/dashboard/admin', '/loginx', '/register', '/design-systems']) expect(isPublicRoute(p)).toBe(false);
});

test('every page in the (auth) group is reachable without a session', () => {
  const authDir = join(import.meta.dirname, '..', 'app', '(auth)');
  const routes = readdirSync(authDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  expect(routes.length).toBeGreaterThan(0);
  for (const r of routes) {
    expect(isPublicRoute(`/${r}`)).toBe(true);
    expect(isPublicRoute(`/${r}/some-token`)).toBe(true);
  }
});
