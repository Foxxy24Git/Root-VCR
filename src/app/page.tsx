import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function RootPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const dest =
    session.user.role === "admin" ? "/admin/dashboard" : "/reseller/dashboard"
  redirect(dest)
}
