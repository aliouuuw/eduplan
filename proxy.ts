import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { neonAuth } from '@/lib/neon-auth';
import { isPublicRoute } from '@/lib/public-routes';

const requireSession = neonAuth.middleware({ loginUrl: '/login' });

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define redirect map for old to new routes
  const redirectMap: Record<string, string> = {
    '/dashboard/admin/academic-levels': '/dashboard/admin/class-groups',
    '/dashboard/admin/time-slots': '/dashboard/admin/scheduling/time-slots',
    '/dashboard/admin/timetables': '/dashboard/admin/scheduling/timetables',
  };

  // Check for redirects before authentication for seamless transition
  for (const oldPath in redirectMap) {
    if (pathname.startsWith(oldPath)) {
      const newPath = redirectMap[oldPath];
      // Preserve query parameters if any
      const newUrl = new URL(newPath, request.url);
      newUrl.search = request.nextUrl.search;
      return NextResponse.redirect(newUrl);
    }
  }

  if (isPublicRoute(pathname)) return NextResponse.next();

  // Signed out: to /login. Signed in: refreshes the Neon Auth session cookies (D49).
  // Role checks live in each role's layout (src/app/dashboard/*/layout.tsx), which can read the database.
  return requireSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
