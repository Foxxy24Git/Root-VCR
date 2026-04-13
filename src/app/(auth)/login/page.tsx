import { LoginForm } from "./login-form"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  // Server-side: kalau sudah login, langsung redirect
  const session = await auth()
  if (session?.user) {
    const dest =
      session.user.role === "admin" ? "/admin/dashboard" : "/reseller/dashboard"
    redirect(dest)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Root.VCR</h1>
        <p className="text-sm text-gray-500 mt-1">Sistem Manajemen Voucher RT/RW Net</p>
      </div>
      <LoginForm />
    </div>
  )
}
