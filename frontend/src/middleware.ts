// Temporarily commenting out Clerk authentication middleware
/*
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/.well-known/(.*)', // ✅ OAuth callback files
  '/post-auth',         // ✅ our handoff page
  '/',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})
*/

// Simple middleware without authentication
import { NextRequest, NextResponse } from 'next/server'

export default function middleware(request: NextRequest) {
  // Allow all requests to pass through without authentication
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}