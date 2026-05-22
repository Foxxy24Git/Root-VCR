import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"
import { requireSuperAdmin } from "@/lib/api-helpers"

export const metadata = {
  title: "Super Admin — Root.VCR",
  robots: { index: false, follow: false },
}

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  return (
    <AppShell role="super-admin" companyName="Root.VCR · Super Admin">
      {children}
    </AppShell>
  )
}
