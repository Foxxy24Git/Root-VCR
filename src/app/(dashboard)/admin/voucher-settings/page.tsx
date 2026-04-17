import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { VoucherSettingsForm } from "./VoucherSettingsForm"

export const metadata = {
  title: "Voucher Settings — Root.VCR Admin",
}

type CodeFormat = "alphanumeric_upper" | "alphanumeric_lower" | "alphanumeric_mixed" | "numeric"

const VALID_FORMATS: CodeFormat[] = ["alphanumeric_upper", "alphanumeric_lower", "alphanumeric_mixed", "numeric"]

function toCodeFormat(v: string | null | undefined): CodeFormat {
  if (v && VALID_FORMATS.includes(v as CodeFormat)) return v as CodeFormat
  return "alphanumeric_upper"
}

export default async function VoucherSettingsPage() {
  const { user, error } = await requireAdmin()
  if (error || !user) redirect("/login")

  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "voucher_prefix",
          "voucher_code_length",
          "voucher_code_format",
          "voucher_username_equals_password",
          "voucher_password_prefix",
        ],
      },
    },
  })

  const map: Record<string, string | null> = {}
  rows.forEach((r) => { map[r.key] = r.value })

  const initial = {
    voucher_prefix:                   map.voucher_prefix ?? "",
    voucher_code_length:              parseInt(map.voucher_code_length ?? "8"),
    voucher_code_format:              toCodeFormat(map.voucher_code_format),
    voucher_username_equals_password: map.voucher_username_equals_password === "true",
    voucher_password_prefix:          map.voucher_password_prefix ?? "",
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Voucher Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Konfigurasi prefix, panjang, dan format kode voucher yang digenerate.
        </p>
      </div>

      <VoucherSettingsForm initial={initial} />
    </div>
  )
}
