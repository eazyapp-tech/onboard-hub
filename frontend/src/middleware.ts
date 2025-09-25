import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can go here
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Check if user has valid token and authorized domain
        if (!token) return false
        
        const email = token.email as string
        if (!email) return false
        
        const allowedDomains = ['eazyapp.tech', 'rentok.com']
        const userDomain = email.split('@')[1]
        
        return allowedDomains.includes(userDomain)
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - auth (authentication pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
