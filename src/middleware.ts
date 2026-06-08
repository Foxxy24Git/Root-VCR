import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

// Map dari role ke dashboard path default (untuk auto-redirect post-login).
function defaultDashboardFor(role: string | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard"
    case "TENANT_ADMIN":
      return "/admin/dashboard"
    case "RESELLER":
      return "/reseller/dashboard"
    default:
      return "/login"
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ── Public routes ────────────────────────────────────────────
  const isLoginPage =
    pathname === "/login" || pathname === "/super-admin/login"
  const isNextAuthRoute = pathname.startsWith("/api/auth")

  // Public health probe (deploy scripts, uptime monitoring) — no session needed.
  if (pathname === "/api/health") {
    return NextResponse.next()
  }

  if (isLoginPage || isNextAuthRoute) {
    // Logged-in user hitting any login page → redirect ke dashboard sesuai role
    if (isLoginPage && session) {
      const dest = defaultDashboardFor(session.user?.role)
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // ── Require authentication ────────────────────────────────────
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Session diperlukan" },
        { status: 401 }
      )
    }
    // Super-admin area redirect ke super-admin login, lainnya ke /login
    const loginPath = pathname.startsWith("/super-admin")
      ? "/super-admin/login"
      : "/login"
    const loginUrl = new URL(loginPath, req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = session.user?.role
  const tenantId = session.user?.tenantId ?? null

  // ── SUPER ADMIN area ──────────────────────────────────────────
  if (
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/api/super-admin")
  ) {
    if (role !== "SUPER_ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Hanya Super Admin yang bisa mengakses" },
          { status: 403 }
        )
      }
      return NextResponse.redirect(
        new URL(defaultDashboardFor(role), req.url)
      )
    }
    return NextResponse.next()
  }

  // ── TENANT ADMIN area ─────────────────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "TENANT_ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Hanya Tenant Admin yang bisa mengakses" },
          { status: 403 }
        )
      }
      return NextResponse.redirect(
        new URL(defaultDashboardFor(role), req.url)
      )
    }
    // Tenant Admin wajib punya tenantId (defensive)
    if (!tenantId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Tenant context wajib" },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // ── RESELLER area ─────────────────────────────────────────────
  if (pathname.startsWith("/reseller") || pathname.startsWith("/api/reseller")) {
    if (role !== "RESELLER") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Hanya Reseller yang bisa mengakses" },
          { status: 403 }
        )
      }
      return NextResponse.redirect(
        new URL(defaultDashboardFor(role), req.url)
      )
    }
    if (!tenantId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Tenant context wajib" },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match semua path kecuali:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico, logo.png, uploads (public assets)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|uploads).*)",
  ],
}
