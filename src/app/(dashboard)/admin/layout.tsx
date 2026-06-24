import { AppShell } from '@/components/layout/AppShell'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'

async function getLogoSettings(tenantId?: string | null) {
  if (!tenantId) return { logoUrl: undefined, companyName: undefined }
  try {
    const rows = await prisma.setting.findMany({
      where: {
        tenant_id: tenantId,
        key: { in: ['company_logo_url', 'company_name'] }
      },
    })
    const map: Record<string, string> = {}
    rows.forEach(r => { if (r.value) map[r.key] = r.value })
    return { logoUrl: map.company_logo_url || undefined, companyName: map.company_name || undefined }
  } catch {
    return { logoUrl: undefined, companyName: undefined }
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin()
  const { logoUrl, companyName } = await getLogoSettings(user?.tenantId)
  return (
    <AppShell role="admin" logoUrl={logoUrl} companyName={companyName}>
      {children}
    </AppShell>
  )
}
