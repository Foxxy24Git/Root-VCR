"use client"

import { useState, FormEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn("tenant-login", {
        email,
        password,
        redirect: false,
      })

      if (!result?.ok || result.error) {
        setError("Email atau password salah, atau akun dinonaktifkan.")
        return
      }

      // Ambil role dari /api/auth/me untuk redirect yang tepat
      const meRes = await fetch("/api/auth/me")
      if (meRes.ok) {
        const { user } = await meRes.json()
        const dest =
          callbackUrl ??
          (user.role === "TENANT_ADMIN" ? "/admin/dashboard" : "/reseller/dashboard")
        router.push(dest)
        router.refresh()
      } else {
        router.push(callbackUrl ?? "/")
        router.refresh()
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
      {/* Error message */}
      {error && (
        <div className="login-error" role="alert">
          <svg viewBox="0 0 20 20" fill="currentColor" className="login-error__icon">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Email field */}
      <div className="login-field">
        <label htmlFor="login-email" className="login-field__label">
          Email Address
        </label>
        <div className="login-input-wrapper">
          <Mail className="login-input-icon" />
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            placeholder="admin@root.vcr"
            disabled={loading}
          />
        </div>
      </div>

      {/* Password field */}
      <div className="login-field">
        <label htmlFor="login-password" className="login-field__label">
          Password
        </label>
        <div className="login-input-wrapper">
          <Lock className="login-input-icon" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input login-input--password"
            placeholder="••••••••"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="login-password-toggle"
            tabIndex={-1}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <div className="login-options">
        <label className="login-remember" htmlFor="login-remember">
          <input
            id="login-remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="login-remember__checkbox"
          />
          <span className="login-remember__text">Ingat saya</span>
        </label>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="login-submit"
      >
        {loading ? (
          <>
            <Loader2 className="login-submit__spinner" />
            Memproses…
          </>
        ) : (
          "Masuk"
        )}
      </button>
    </form>
  )
}
