import { LoginForm } from "./login-form"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Wifi, Shield, Zap } from "lucide-react"
import "./login.css"

export const metadata = {
  title: "Login — Root.VCR",
  description: "Masuk ke sistem manajemen voucher RT/RW Net",
}

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    const dest =
      session.user.role === "SUPER_ADMIN"
        ? "/super-admin/dashboard"
        : session.user.role === "TENANT_ADMIN"
        ? "/admin/dashboard"
        : "/reseller/dashboard"
    redirect(dest)
  }

  return (
    <div className="login-page">
      {/* ── Left Panel (Desktop only): Branding ────────────────── */}
      <div className="login-branding">
        {/* Floating orbs for depth */}
        <div className="login-orb login-orb--1" />
        <div className="login-orb login-orb--2" />
        <div className="login-orb login-orb--3" />

        <div className="login-branding__content">
          {/* Logo */}
          <div className="login-brand-logo">
            <div className="login-brand-logo__icon">
              <Wifi className="h-7 w-7 text-white" />
            </div>
            <span className="login-brand-logo__text">Root.VCR</span>
          </div>

          {/* Tagline */}
          <h1 className="login-branding__title">
            Kelola Voucher<br />
            WiFi Anda<br />
            Dengan Mudah
          </h1>
          <p className="login-branding__subtitle">
            Sistem manajemen voucher RT/RW Net modern. Generate, kelola,
            dan pantau semua voucher hotspot dalam satu platform.
          </p>

          {/* Feature highlights */}
          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature__icon">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <div className="login-feature__title">Generate Instan</div>
                <div className="login-feature__desc">Buat voucher dalam hitungan detik</div>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature__icon">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <div className="login-feature__title">Aman & Andal</div>
                <div className="login-feature__desc">Integrasi langsung ke MikroTik</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="login-branding__footer">
          © {new Date().getFullYear()} Root.VCR — All rights reserved
        </div>
      </div>

      {/* ── Right Panel: Login Form ─────────────────────────────── */}
      <div className="login-form-panel">
        <div className="login-form-container">
          {/* Mobile logo — only visible on small screens */}
          <div className="login-mobile-header">
            <div className="login-mobile-logo">
              <div className="login-brand-logo__icon login-brand-logo__icon--mobile">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <span className="login-mobile-logo__text">Root.VCR</span>
            </div>
            <p className="login-mobile-subtitle">
              Sistem Manajemen Voucher RT/RW Net
            </p>
          </div>

          {/* Greeting */}
          <div className="login-greeting">
            <h2 className="login-greeting__title">Selamat Datang 👋</h2>
            <p className="login-greeting__subtitle">
              Masuk ke akun Anda untuk melanjutkan
            </p>
          </div>

          {/* Form */}
          <LoginForm />

          {/* Footer on mobile */}
          <div className="login-form-footer">
            <p>© {new Date().getFullYear()} Root.VCR</p>
          </div>
        </div>
      </div>
    </div>
  )
}
