// Routes reachable without a session. Matches whole path segments: a bare startsWith('/') once made every route public.
// /design-system is the component preview; the page itself 404s in production.
// Every page under src/app/(auth) must be listed here; public-routes.test.ts checks it.
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/invite', '/design-system'];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(`${route}/`))
  );
}
