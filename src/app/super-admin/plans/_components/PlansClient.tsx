"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Users,
  Ticket,
  CalendarRange,
  Loader2,
  CheckCircle2,
  XCircle,
  Package,
} from "lucide-react"
import { PlanFormModal } from "./PlanFormModal"
import { PLAN_FEATURES } from "@/lib/validations/plan"

export interface PlanRow {
  id: string
  name: string
  description: string | null
  price: string
  duration_days: number
  is_trial: boolean
  max_resellers: number
  max_vouchers_per_month: number
  features: string[]
  is_active: boolean
  tenant_count: number
}

interface Props {
  initialPlans: PlanRow[]
}

const idr = (v: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v))

export function PlansClient({ initialPlans }: Props) {
  const router = useRouter()
  const [plans] = useState<PlanRow[]>(initialPlans)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PlanRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(plan: PlanRow) {
    setEditing(plan)
    setModalOpen(true)
  }

  async function handleDelete(plan: PlanRow) {
    if (
      !confirm(
        plan.tenant_count > 0
          ? `Plan "${plan.name}" sedang dipakai ${plan.tenant_count} tenant. Plan akan di-non-aktifkan (bukan dihapus). Lanjut?`
          : `Hapus plan "${plan.name}"? Aksi ini tidak bisa dibatalkan.`,
      )
    ) {
      return
    }

    setDeletingId(plan.id)
    try {
      const res = await fetch(`/api/super-admin/plans/${plan.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.message ?? "Gagal menghapus plan")
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Belum ada plan. Buat plan pertama untuk mulai menjual subscription.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              deleting={deletingId === p.id}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <PlanFormModal
          plan={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function PlanCard({
  plan,
  deleting,
  onEdit,
  onDelete,
}: {
  plan: PlanRow
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const featureLabels = plan.features
    .map((key) => PLAN_FEATURES.find((f) => f.key === key)?.label ?? key)
    .filter(Boolean)

  return (
    <div
      className={
        "relative bg-white dark:bg-slate-800 rounded-2xl border shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 flex flex-col transition-all " +
        (plan.is_trial
          ? "border-purple-200 dark:border-purple-800/60 ring-1 ring-purple-100 dark:ring-purple-900/40"
          : "border-slate-100 dark:border-slate-700") +
        (!plan.is_active ? " opacity-60" : "")
      }
    >
      {/* Top badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {plan.is_trial && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Trial
          </span>
        )}
        {!plan.is_active && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
            Non-aktif
          </span>
        )}
        {plan.tenant_count > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-semibold uppercase tracking-wider">
            {plan.tenant_count} tenant
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {plan.name}
      </h3>
      {plan.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
          {plan.description}
        </p>
      )}

      <div className="mt-4 mb-5">
        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {plan.is_trial || Number(plan.price) === 0 ? "Gratis" : idr(plan.price)}
        </span>
        {!plan.is_trial && Number(plan.price) > 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">
            / {plan.duration_days} hari
          </span>
        )}
        {plan.is_trial && (
          <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">
            / {plan.duration_days} hari trial
          </span>
        )}
      </div>

      <div className="space-y-2.5 text-sm flex-1">
        <Stat
          icon={Users}
          label="Max Reseller"
          value={plan.max_resellers.toLocaleString("id-ID")}
        />
        <Stat
          icon={Ticket}
          label="Max Voucher / bulan"
          value={plan.max_vouchers_per_month.toLocaleString("id-ID")}
        />
        <Stat
          icon={CalendarRange}
          label="Durasi"
          value={`${plan.duration_days} hari`}
        />
      </div>

      {featureLabels.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Fitur
          </p>
          <ul className="space-y-1">
            {featureLabels.map((label) => (
              <li
                key={label}
                className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
      <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

// Re-export for type comfort
export { XCircle }
