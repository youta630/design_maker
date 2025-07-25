import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/app'

  if (!next.startsWith('/')) {
    next = '/app'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      // Validate forwarded host to prevent host header injection
      const allowedHosts = (process.env.ALLOWED_HOSTS || 'localhost,snap2spec.com').split(',')
      const isValidHost = forwardedHost && allowedHosts.includes(forwardedHost)
      
      const redirectUrl = isLocalEnv
        ? `${origin}${next}`
        : isValidHost
        ? `https://${forwardedHost}${next}`
        : `${origin}${next}` // Fallback to origin if forwarded host is not allowed

      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}