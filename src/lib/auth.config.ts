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
  // Trust the X-Forwarded-Host from the reverse proxy (Caddy/nginx) in prod.
  trustHost: true,
  // Secure cookies in production (requires HTTPS — enforced at the proxy).
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    // SameSite=lax blocks cross-site POSTs from carrying the session cookie,
    // which is the primary CSRF defence for session-authenticated mutations.
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
} satisfies NextAuthConfig
