import type { InvoiceStatus } from "@prisma/client"

const STATUS_MAP: Record<
  InvoiceStatus,
  { label: string; cls: string }
> = {
  PENDING: {
    label: "Pending",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
  AWAITING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  PAID: {
    label: "Lunas",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  OVERDUE: {
    label: "Overdue",
    cls: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const v = STATUS_MAP[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-700",
  }
  return (
    <span
      className={
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider " +
        v.cls
      }
    >
      {v.label}
    </span>
  )
}
