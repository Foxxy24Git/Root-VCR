import { getSessionUser } from "@/lib/api-helpers"
import { redirect } from "next/navigation"

export default async function VoucherSemuaPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role === "SUPER_ADMIN" || user.role === "TENANT_ADMIN") {
    redirect("/admin/vouchers?tab=vouchers")
  }

  redirect("/reseller/vouchers")
}
