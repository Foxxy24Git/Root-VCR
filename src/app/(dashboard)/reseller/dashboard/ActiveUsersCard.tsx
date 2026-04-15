"use client"

import { useEffect, useState } from "react"
import { Wifi, RefreshCw, MonitorSmartphone } from "lucide-react"

interface ActiveUser {
  username: string
  ip: string | null
  mac: string | null
  uptime: string | null
  server: string | null
}

export function ActiveUsersCard() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/reseller/active-users")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mengambil data")
      setActiveUsers(data.activeUsers ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal terhubung")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveUsers()
  }, [])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-200">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-green-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Active Users</h2>
          {!loading && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {activeUsers.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchActiveUsers}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="px-5 py-6 text-center text-sm text-red-500 dark:text-red-400">{error}</div>
      ) : loading ? (
        <div className="px-5 py-8 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Mengambil data dari MikroTik...
        </div>
      ) : activeUsers.length === 0 ? (
        <div className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
          <MonitorSmartphone className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm">Tidak ada user aktif saat ini</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Username</th>
                  <th className="px-5 py-3 text-left font-semibold">IP</th>
                  <th className="px-5 py-3 text-left font-semibold">Uptime</th>
                  <th className="px-5 py-3 text-left font-semibold">MAC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {activeUsers.map((u) => (
                  <tr key={u.username} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100 tracking-wider">{u.username}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{u.ip ?? "-"}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{u.uptime ?? "-"}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-500 font-mono text-xs">{u.mac ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
            {activeUsers.map((u) => (
              <div key={u.username} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100 tracking-wider text-sm">{u.username}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold">Online</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                  <p>IP: <span className="font-mono">{u.ip ?? "-"}</span></p>
                  <p>Uptime: {u.uptime ?? "-"}</p>
                  {u.mac && <p>MAC: <span className="font-mono">{u.mac}</span></p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
