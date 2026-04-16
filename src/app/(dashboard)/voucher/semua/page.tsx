import { getSessionUser } from "@/lib/api-helpers"
import { redirect } from "next/navigation"

export default async function VoucherSemuaPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role === "admin") {
    redirect("/admin/vouchers?tab=vouchers")
  }

  redirect("/reseller/vouchers")
}
