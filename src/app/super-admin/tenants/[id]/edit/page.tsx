import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { EditTenantForm } from "./EditTenantForm"

export const metadata = {
  title: "Edit Tenant — Super Admin",
  robots: { index: false, follow: false },
}

export default async function EditTenantPage({
  params,
}: {
  params: { id: string }
}) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      slug: true,
      owner_name: true,
      owner_email: true,
      owner_phone: true,
      mikrotik_host: true,
      mikrotik_port: true,
      mikrotik_username: true,
      mikrotik_use_ssl: true,
      max_resellers: true,
      max_vouchers_per_month: true,
    },
  })

  if (!tenant) notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div>
        <Link
          href={`/super-admin/tenants/${tenant.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke detail
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-2">
          Edit Tenant: {tenant.name}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Slug ({tenant.slug}) tidak dapat diubah. Untuk perubahan plan, gunakan endpoint khusus.
        </p>
      </div>

      <EditTenantForm
        tenantId={tenant.id}
        initial={{
          name: tenant.name,
          owner_name: tenant.owner_name,
          owner_email: tenant.owner_email,
          owner_phone: tenant.owner_phone,
          mikrotik_host: tenant.mikrotik_host,
          mikrotik_port: tenant.mikrotik_port,
          mikrotik_username: tenant.mikrotik_username,
          mikrotik_use_ssl: tenant.mikrotik_use_ssl,
          max_resellers: tenant.max_resellers,
          max_vouchers_per_month: tenant.max_vouchers_per_month,
        }}
      />
    </div>
  )
}
