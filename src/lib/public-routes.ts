// Routes reachable without a session. Matches whole path segments: a bare startsWith('/') once made every route public.
// /design-system is the component preview; the page itself 404s in production.
const PUBLIC_ROUTES = ['/login', '/register', '/', '/design-system'];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(`${route}/`))
  );
}
