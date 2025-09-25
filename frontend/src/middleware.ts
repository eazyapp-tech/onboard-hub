import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    console.log('Middleware running for:', req.nextUrl.pathname)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log('Authorization check:', { 
          path: req.nextUrl.pathname, 
          hasToken: !!token,
          tokenEmail: token?.email 
        })
        
        // For now, just check if token exists
        return !!token
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
