"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Wallet, Plus, ArrowUpRight } from "lucide-react"

export interface WalletCardProps extends React.HTMLAttributes<HTMLDivElement> {
  balance: number
  onTopUpClick?: () => void
  onWithdrawClick?: () => void
}

export function WalletCard({
  balance,
  onTopUpClick,
  onWithdrawClick,
  className,
  ...props
}: WalletCardProps) {
  const handleTopUp = onTopUpClick ?? (() => {
    const raw = window.prompt("Masukkan nominal Top Up (contoh: 100000):")
    if (!raw) return
    const amount = raw.replace(/\D/g, "")
    if (!amount) return
    window.open(
      `https://wa.me/6282288231533?text=${encodeURIComponent(`HALOO TOP UP ${amount}`)}`,
      "_blank"
    )
  })

  const handleWithdraw = onWithdrawClick ?? (() => {
    const raw = window.prompt("Masukkan nominal Withdraw (contoh: 100000):")
    if (!raw) return
    const amount = raw.replace(/\D/g, "")
    if (!amount) return
    window.open(
      `https://wa.me/6282288231533?text=${encodeURIComponent(`HALOO WITHDRAW ${amount}`)}`,
      "_blank"
    )
  })

  return (
    <div
      className={cn(
        "relative overflow-hidden p-6 rounded-[20px] shadow-xl",
        "bg-gradient-to-br from-blue-500 to-cyan-500",
        "text-white",
        className
      )}
      {...props}
    >
      {/* Decorative Orbs */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white opacity-10 blur-xl" />

      <div className="relative z-10 w-full">
        <div className="flex items-center gap-2 mb-6 opacity-90">
          <Wallet className="h-5 w-5" />
          <span className="text-sm font-medium tracking-wide uppercase">
            Available Balance
          </span>
        </div>

        <div className="mb-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Rp {Number(balance).toLocaleString("id-ID")}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleTopUp}
            className="flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Top Up
          </button>

          <button
            onClick={handleWithdraw}
            className="flex items-center gap-2 rounded-xl bg-transparent border border-white/30 hover:bg-white/10 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdraw
          </button>
        </div>
      </div>
    </div>
  )
}
