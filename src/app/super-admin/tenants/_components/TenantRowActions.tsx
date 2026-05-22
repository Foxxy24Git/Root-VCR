"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  MoreVertical,
  Eye,
  Pause,
  Play,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface Props {
  tenantId: string
  isActive: boolean
}

export function TenantRowActions({ tenantId, isActive }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function toggleSuspend() {
    const endpoint = isActive
      ? `/api/super-admin/tenants/${tenantId}/suspend`
      : `/api/super-admin/tenants/${tenantId}/activate`
    const body = isActive
      ? JSON.stringify({ reason: "Suspended via dashboard" })
      : undefined

    setLoading(isActive ? "suspend" : "activate")
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data?.message ?? "Aksi gagal")
        return
      }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="Aksi tenant"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MoreVertical className="w-4 h-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => router.push(`/super-admin/tenants/${tenantId}`)}
          className="cursor-pointer"
        >
          <Eye className="w-4 h-4 mr-2" />
          Lihat Detail
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={toggleSuspend}
          className="cursor-pointer"
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Suspend
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Activate
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
