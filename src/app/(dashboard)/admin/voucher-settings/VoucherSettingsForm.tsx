"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, SlidersHorizontal } from "lucide-react"
import { generateVoucherCode, generateRandomPassword } from "@/lib/utils"
import { cn } from "@/lib/utils"

type CodeFormat = "alphanumeric_upper" | "alphanumeric_lower" | "alphanumeric_mixed" | "numeric"

interface VoucherSettingsFormProps {
  initial: {
    voucher_prefix: string
    voucher_code_length: number
    voucher_code_format: CodeFormat
    voucher_username_equals_password: boolean
    voucher_password_prefix: string
  }
}

function generatePreview(prefix: string, length: number, format: CodeFormat): string {
  return generateVoucherCode(prefix, length, format)
}

export function VoucherSettingsForm({ initial }: VoucherSettingsFormProps) {
  const [prefix, setPrefix] = useState(initial.voucher_prefix)
  const [codeLength, setCodeLength] = useState(initial.voucher_code_length)
  const [format, setFormat] = useState<CodeFormat>(initial.voucher_code_format)
  const [usernameEqualsPassword, setUsernameEqualsPassword] = useState(
    initial.voucher_username_equals_password
  )
  const [passwordPrefix, setPasswordPrefix] = useState(initial.voucher_password_prefix)
  const [previewPassword, setPreviewPassword] = useState(() => generateRandomPassword(8))

  const [preview, setPreview] = useState(() => generatePreview(prefix, codeLength, format))

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const refreshPreview = useCallback(() => {
    setPreview(generatePreview(prefix, codeLength, format))
    setPreviewPassword(generateRandomPassword(8))
  }, [prefix, codeLength, format])

  React.useEffect(() => {
    setPreview(generatePreview(prefix, codeLength, format))
  }, [prefix, codeLength, format])

  const handlePrefixChange = (v: string) => {
    const clean = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5)
    setPrefix(clean)
  }

  const handlePasswordPrefixChange = (v: string) => {
    const clean = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5)
    setPasswordPrefix(clean)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            { key: "voucher_prefix",                  value: prefix },
            { key: "voucher_code_length",              value: String(codeLength) },
            { key: "voucher_code_format",              value: format },
            { key: "voucher_username_equals_password", value: usernameEqualsPassword ? "true" : "false" },
            { key: "voucher_password_prefix",          value: passwordPrefix },
          ],
        }),
      })
      const data = await res.json()
      setMsg({ type: res.ok ? "success" : "error", text: data.message || (res.ok ? "Tersimpan" : "Gagal") })
    } catch {
      setMsg({ type: "error", text: "Gagal menyimpan pengaturan" })
    } finally {
      setSaving(false)
    }
  }

  const formatOptions: { value: CodeFormat; label: string; example: string }[] = [
    { value: "alphanumeric_upper", label: "UPPERCASE",  example: "ABC123" },
    { value: "alphanumeric_lower", label: "lowercase",  example: "abc123" },
    { value: "alphanumeric_mixed", label: "MixedCase",  example: "AbC1x9" },
    { value: "numeric",            label: "Numeric",    example: "123456" },
  ]

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Left: Config ─────────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-5">

        {msg && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-xl text-sm border",
            msg.type === "success"
              ? "bg-green-50 text-green-700 border-green-100"
              : "bg-red-50 text-red-600 border-red-100"
          )}>
            {msg.type === "success"
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {msg.text}
          </div>
        )}

        {/* Core Formatting */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden transition-colors duration-200">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Core Formatting</h2>
          </div>
          <div className="p-5 space-y-6">

            {/* Prefix */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Code Prefix <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(maks 5 karakter, alfanumerik)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => handlePrefixChange(e.target.value)}
                  maxLength={5}
                  placeholder="Contoh: VCR"
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 font-mono font-semibold tracking-widest uppercase text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {prefix.length}/5
                </span>
              </div>
            </div>

            {/* Password Prefix */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Password Prefix <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">(maks 5 karakter, alfanumerik)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={passwordPrefix}
                  onChange={(e) => handlePasswordPrefixChange(e.target.value)}
                  maxLength={5}
                  placeholder="Contoh: PS"
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 font-mono font-semibold tracking-widest uppercase text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {passwordPrefix.length}/5
                </span>
              </div>
            </div>

            {/* Code Length Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Code Length
                </label>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                  {codeLength} karakter
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                step={1}
                value={codeLength}
                onChange={(e) => setCodeLength(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400 dark:text-slate-500">3</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">10</span>
              </div>
            </div>

            {/* Format Radio */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
                Character Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {formatOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      format === opt.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-700/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="format"
                        value={opt.value}
                        checked={format === opt.value}
                        onChange={() => setFormat(opt.value)}
                        className="accent-blue-600"
                      />
                      <span className={cn(
                        "text-sm font-semibold",
                        format === opt.value ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"
                      )}>
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 pl-5">{opt.example}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Username = Password Toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-5 transition-colors duration-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Username = Password</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gunakan kode voucher yang sama sebagai username dan password hotspot
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={usernameEqualsPassword}
              onClick={() => setUsernameEqualsPassword((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30",
                usernameEqualsPassword ? "bg-blue-600" : "bg-slate-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  usernameEqualsPassword ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:pointer-events-none"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>

      {/* ── Right: Live Preview ──────────────────────────────────── */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden transition-colors duration-200">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Live Preview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Contoh kode voucher berdasarkan konfigurasi</p>
          </div>
          <div className="p-6 space-y-5">
            {/* Preview Code Display */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 shadow-lg shadow-blue-500/20 space-y-3">
              <div className="text-center">
                <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest mb-1">Username</p>
                <p className="text-xl font-black text-white tracking-widest font-mono break-all">{preview}</p>
              </div>
              <div className="border-t border-white/20 pt-3 text-center">
                <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest mb-1">Password</p>
                <p className="text-xl font-black text-white tracking-widest font-mono break-all">
                  {usernameEqualsPassword ? preview : passwordPrefix + previewPassword}
                </p>
              </div>
            </div>

            {/* Config Summary */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Prefix</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {prefix || <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Panjang Kode</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{codeLength} karakter</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Format</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {formatOptions.find((f) => f.value === format)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Username = Password</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  usernameEqualsPassword
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                )}>
                  {usernameEqualsPassword ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              {!usernameEqualsPassword && (
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Password Prefix</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
                    {passwordPrefix || <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>}
                  </span>
                </div>
              )}
            </div>

            {/* Refresh Preview */}
            <button
              type="button"
              onClick={refreshPreview}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Ulang Preview
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
