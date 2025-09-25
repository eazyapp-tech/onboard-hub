import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  debug: true, // Enable debug mode
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user's email domain is allowed
      if (user.email) {
        const allowedDomains = ['eazyapp.tech', 'rentok.com']
        const userDomain = user.email.split('@')[1]
        
        if (allowedDomains.includes(userDomain)) {
          return true
        }
      }
      
      // Reject sign-in for unauthorized domains
      return false
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
