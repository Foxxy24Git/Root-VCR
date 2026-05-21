import type { NextAuthConfig } from "next-auth"
import type { Role } from "@prisma/client"

export const authConfig = {
  providers: [], // configure in auth.ts
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role as Role
        token.tenantId = user.tenantId ?? null
        token.tenantSlug = user.tenantSlug ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.tenantId = (token.tenantId as string | null) ?? null
        session.user.tenantSlug = (token.tenantSlug as string | null) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig
