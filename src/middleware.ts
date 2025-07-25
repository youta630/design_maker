import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response with comprehensive security headers
  const response = NextResponse.next();
  
  // Comprehensive security headers for all requests
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Additional headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  // Define protected routes that require authentication
  const protectedRoutes = ['/app'];
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // For protected routes, perform proper authentication validation
  if (isProtectedRoute) {
    try {
      // Create Supabase client for server-side authentication
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              // In middleware, we can't set cookies on the request
              // The actual cookie setting happens in the response
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options)
              })
            },
          },
        }
      );

      // Perform actual user validation
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // Only log in development to avoid production log pollution
        if (process.env.NODE_ENV === 'development') {
          console.log('Authentication failed for protected route:', pathname);
        }
        return NextResponse.redirect(new URL('/landing', request.url));
      }

      // Authentication successful - continue to the protected route
      if (process.env.NODE_ENV === 'development') {
        console.log('Authentication verified for user:', user.email);
      }

    } catch (error) {
      // Authentication error - redirect to landing
      if (process.env.NODE_ENV === 'development') {
        console.error('Middleware auth error:', error);
      }
      return NextResponse.redirect(new URL('/landing', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Include API routes
    '/api/:path*',
    // Include app routes (protected)
    '/app/:path*',
    // Include most pages but exclude static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)'
  ],
};