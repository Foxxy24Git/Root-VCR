import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function RootPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const dest =
    session.user.role === "SUPER_ADMIN"
      ? "/super-admin"
      : session.user.role === "TENANT_ADMIN"
      ? "/admin/dashboard"
      : "/reseller/dashboard"
  redirect(dest)
}
