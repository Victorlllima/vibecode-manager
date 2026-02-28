import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET is not set')
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session) {
        session.accessToken = token.accessToken as string
      }
      return session
    },
  },
})
