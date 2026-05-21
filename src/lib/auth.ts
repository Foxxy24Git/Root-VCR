import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import {
  tenantLoginSchema,
  superAdminLoginSchema,
} from "@/lib/validations/auth"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // ── Tenant Login (TENANT_ADMIN / RESELLER) ────────────────────────
    // Endpoint: POST /api/auth/callback/tenant-login
    // Fields  : tenantCode (slug), email, password
    Credentials({
      id: "tenant-login",
      name: "Tenant Login",
      credentials: {
        tenantCode: { label: "Kode Tenant", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = tenantLoginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { tenantCode, email, password } = parsed.data

        const tenant = await prisma.tenant.findUnique({
          where: { slug: tenantCode.toLowerCase() },
          select: { id: true, slug: true, is_active: true },
        })
        if (!tenant || !tenant.is_active) return null

        const user = await prisma.user.findFirst({
          where: { email, tenant_id: tenant.id },
        })
        if (!user) return null
        if (!user.is_active || user.is_frozen) return null
        // SUPER_ADMIN tidak boleh login lewat tenant endpoint
        if (user.role === "SUPER_ADMIN") return null

        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        }
      },
    }),

    // ── Super Admin Login ─────────────────────────────────────────────
    // Endpoint: POST /api/auth/callback/super-admin-login
    // Fields  : email, password (tanpa tenantCode)
    Credentials({
      id: "super-admin-login",
      name: "Super Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = superAdminLoginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null
        if (!user.is_active || user.is_frozen) return null
        if (user.role !== "SUPER_ADMIN") return null

        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: null,
          tenantSlug: null,
        }
      },
    }),
  ],
})
