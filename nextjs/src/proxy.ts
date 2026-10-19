import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    },
  );

  let authenticated = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    authenticated = !error && Boolean(data?.claims.sub);
  } catch {
    // An unverifiable session gets the same redirects as a missing session.
  }
  const { pathname, search } = request.nextUrl;
  const protectedRoute = ['/profile', '/admin', '/reset-password'].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  let destination: URL | undefined;
  if (!authenticated && protectedRoute) {
    destination = new URL('/login', request.url);
    destination.searchParams.set('next', pathname + search);
  } else if (authenticated && ['/login', '/register'].includes(pathname)) {
    destination = new URL('/', request.url);
  }
  if (destination) {
    const redirected = NextResponse.redirect(destination);
    response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie));
    response = redirected;
  }
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|apple-icon|icons(?:/|$)|sw\\.js|manifest(?:\\.|/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
