import { AppShell } from '@/components/layout/AppShell'
import { prisma } from '@/lib/prisma'

async function getLogoSettings() {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['company_logo_url', 'company_name'] } },
    })
    const map: Record<string, string> = {}
    rows.forEach(r => { if (r.value) map[r.key] = r.value })
    return { logoUrl: map.company_logo_url || undefined, companyName: map.company_name || undefined }
  } catch {
    return { logoUrl: undefined, companyName: undefined }
  }
}

export default async function ResellerLayout({ children }: { children: React.ReactNode }) {
  const { logoUrl, companyName } = await getLogoSettings()
  return (
    <AppShell role="reseller" logoUrl={logoUrl} companyName={companyName}>
      {children}
    </AppShell>
  )
}
