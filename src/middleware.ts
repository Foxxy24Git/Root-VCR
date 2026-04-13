import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ── Public routes ────────────────────────────────────────────
  const isLoginPage = pathname === "/login"
  const isNextAuthRoute = pathname.startsWith("/api/auth")

  if (isLoginPage || isNextAuthRoute) {
    // Logged-in user hitting /login → redirect to their dashboard
    if (isLoginPage && session) {
      const dest =
        session.user.role === "admin" ? "/admin/dashboard" : "/reseller/dashboard"
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // ── Require authentication ────────────────────────────────────
  if (!session) {
    // API routes → 401 JSON (no redirect)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Session diperlukan" },
        { status: 401 }
      )
    }
    // Page routes → redirect ke login
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { role } = session.user

  // ── Role-based access ─────────────────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Hanya admin yang bisa mengakses" },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL("/reseller/dashboard", req.url))
    }
  }

  if (pathname.startsWith("/reseller") || pathname.startsWith("/api/reseller")) {
    if (role !== "reseller") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Hanya reseller yang bisa mengakses" },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    }
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
