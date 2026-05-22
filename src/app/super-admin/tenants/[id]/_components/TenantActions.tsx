"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Pencil,
  Pause,
  Play,
  CalendarPlus,
  Trash2,
  Loader2,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface Props {
  tenantId: string
  isActive: boolean
  isTrial: boolean
}

export function TenantActions({ tenantId, isActive, isTrial }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendDays, setExtendDays] = useState(7)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function call(
    endpoint: string,
    body?: Record<string, unknown>,
    label?: string,
  ) {
    setBusy(label ?? endpoint)
    setErrorMsg(null)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.message ?? "Aksi gagal")
        return false
      }
      router.refresh()
      return true
    } finally {
      setBusy(null)
    }
  }

  async function handleSuspendOrActivate() {
    if (isActive) {
      setSuspendOpen(true)
    } else {
      await call(
        `/api/super-admin/tenants/${tenantId}/activate`,
        undefined,
        "activate",
      )
    }
  }

  async function confirmSuspend() {
    const ok = await call(
      `/api/super-admin/tenants/${tenantId}/suspend`,
      { reason: suspendReason },
      "suspend",
    )
    if (ok) setSuspendOpen(false)
  }

  async function confirmExtend() {
    if (!isTrial) {
      setErrorMsg("Extend hanya untuk tenant trial (untuk berbayar pakai convert-from-trial).")
      return
    }
    const ok = await call(
      `/api/super-admin/tenants/${tenantId}/extend-trial`,
      { additional_days: extendDays },
      "extend",
    )
    if (ok) setExtendOpen(false)
  }

  async function confirmDelete() {
    setBusy("delete")
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.message ?? "Gagal menghapus tenant")
        return
      }
      router.push("/super-admin/tenants")
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {errorMsg && (
        <div className="w-full mb-2 text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => router.push(`/super-admin/tenants/${tenantId}/edit`)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>

        <button
          onClick={handleSuspendOrActivate}
          disabled={busy !== null}
          className={
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border " +
            (isActive
              ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50")
          }
        >
          {busy === "activate" || busy === "suspend" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isActive ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isActive ? "Suspend" : "Activate"}
        </button>

        <button
          onClick={() => setExtendOpen(true)}
          disabled={busy !== null || !isTrial}
          title={!isTrial ? "Extend hanya tersedia untuk trial" : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Extend Trial
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant</DialogTitle>
            <DialogDescription>
              Tenant tidak akan bisa login sampai diaktifkan kembali.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Alasan Suspend
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              placeholder="Mis. belum bayar invoice INV-2025-001"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setSuspendOpen(false)}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <X className="w-3.5 h-3.5 inline mr-1" />
              Batal
            </button>
            <button
              onClick={confirmSuspend}
              disabled={busy === "suspend" || suspendReason.trim().length < 3}
              className="px-3 py-2 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {busy === "suspend" ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <Pause className="w-3.5 h-3.5 inline mr-1" />
              )}
              Suspend
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend trial dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perpanjang Trial</DialogTitle>
            <DialogDescription>
              Tambah hari trial dari tanggal expire saat ini (atau dari hari ini jika sudah lewat).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Tambahan Hari
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={extendDays}
              onChange={(e) =>
                setExtendDays(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 pt-1">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExtendDays(d)}
                  className="px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  +{d} hari
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setExtendOpen(false)}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={confirmExtend}
              disabled={busy === "extend"}
              className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === "extend" ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <CalendarPlus className="w-3.5 h-3.5 inline mr-1" />
              )}
              Perpanjang
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Tenant?</DialogTitle>
            <DialogDescription>
              Tenant akan di-soft-delete (data tetap tersimpan untuk audit, tapi tidak bisa login). Slug akan diarsipkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteOpen(false)}
              className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              disabled={busy === "delete"}
              className="px-3 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy === "delete" ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 inline mr-1" />
              )}
              Hapus
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
