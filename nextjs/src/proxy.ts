import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/safe-next';

export async function proxy(request: NextRequest) {
  // Static offline assets must never depend on an auth refresh or private cookies.
  if (/^\/offline(?:\.html|-reader\.(?:js|css)|-store\.js)$/.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  let authenticated = false;
  let claimsData: { user_metadata?: { role?: string } } | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    claimsData = (data?.claims as { user_metadata?: { role?: string } }) ?? null;
    authenticated = !error && Boolean(data?.claims.sub);
  } catch {
    // An unverifiable session gets the same redirects as a missing session.
  }
  const { pathname, search } = request.nextUrl;
  const protectedRoute = [
    '/profile',
    '/admin',
    '/recruiter',
    '/invitations',
    '/messages',
    '/reset-password',
    '/dashboard',
    '/my-skills',
    '/skills',
    '/arena',
    '/duel',
    '/discover',
    '/marketplace',
    '/knowledge',
    '/community',
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  let destination: URL | undefined;
  if (!authenticated && protectedRoute) {
    destination = new URL('/login', request.url);
    destination.searchParams.set('next', pathname + search);
  } else if (authenticated && ['/', '/login', '/register'].includes(pathname)) {
    const rawNext = request.nextUrl.searchParams.get('next');
    const safe = safeNext(rawNext);
    let defaultDest = '/dashboard';
    const roleClaim = claimsData?.user_metadata?.role;
    if (roleClaim === 'admin') defaultDest = '/admin/users';
    else if (roleClaim === 'recruiter') defaultDest = '/recruiter';
    destination = new URL(safe !== '/' ? safe : defaultDest, request.url);
  }
  if (destination) {
    const redirected = NextResponse.redirect(destination);
    response.cookies
      .getAll()
      .forEach((cookie) => redirected.cookies.set(cookie));
    response = redirected;
  }
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate, max-age=0',
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-icon|icons(?:/|$)|sw\\.js|manifest(?:\\.|/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
