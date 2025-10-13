import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
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

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If authenticated and trying to access auth pages, redirect to role-specific dashboard
  if (session && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    const userRole = session.user.role;
    const roleRoutes = {
      superadmin: '/dashboard/superadmin',
      admin: '/dashboard/admin',
      teacher: '/dashboard/teacher',
      parent: '/dashboard/parent',
      student: '/dashboard/student',
    };
    const defaultRoute = roleRoutes[userRole as keyof typeof roleRoutes];
    if (defaultRoute) {
      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }
  }

  // Role-based route protection
  if (session && pathname.startsWith('/dashboard')) {
    const userRole = session.user.role;
    
    // Route access rules
    const roleRoutes = {
      superadmin: ['/dashboard/superadmin'],
      admin: ['/dashboard/admin'],
      teacher: ['/dashboard/teacher'],
      parent: ['/dashboard/parent'],
      student: ['/dashboard/student'],
    };

    // Check if user is accessing their allowed routes
    const allowedRoutes = roleRoutes[userRole as keyof typeof roleRoutes] || [];
    const isAccessingAllowedRoute = allowedRoutes.some(route => pathname.startsWith(route));
    
    // If accessing /dashboard root, redirect to role-specific dashboard
    if (pathname === '/dashboard') {
      const defaultRoute = allowedRoutes[0];
      if (defaultRoute) {
        return NextResponse.redirect(new URL(defaultRoute, request.url));
      }
    }

    // If trying to access unauthorized route, redirect to their dashboard
    if (!isAccessingAllowedRoute && pathname !== '/dashboard') {
      const defaultRoute = allowedRoutes[0];
      if (defaultRoute) {
        return NextResponse.redirect(new URL(defaultRoute, request.url));
      }
    }
  }

  return NextResponse.next();
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
