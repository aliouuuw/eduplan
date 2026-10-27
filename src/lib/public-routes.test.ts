import { expect, test } from 'bun:test';
import { isPublicRoute } from './public-routes';

test('public routes match whole segments only', () => {
  for (const p of ['/', '/login', '/login/', '/register', '/design-system']) expect(isPublicRoute(p)).toBe(true);
  for (const p of ['/dashboard', '/dashboard/admin', '/loginx', '/registerfoo', '/design-systems']) expect(isPublicRoute(p)).toBe(false);
});
