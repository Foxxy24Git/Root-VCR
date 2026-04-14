"use client"

import * as React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import {
  Server, Globe, HardDrive, Lock, User,
  CheckCircle2, Loader2, Eye, EyeOff, RefreshCw, AlertCircle,
  Camera, Trash2, AlertTriangle
} from "lucide-react"

interface AdminUser {
  id: string
  name: string
  email: string
  phone: string | null
  location: string | null
  avatar_url: string | null
}

interface Settings {
  mikrotik_host?: string
  mikrotik_api_port?: string
  mikrotik_user?: string
  mikrotik_pass?: string
  hotspot_login_url?: string
  company_name?: string
  company_logo_url?: string
  backup_auto_enabled?: string
  backup_schedule?: string
  backup_retention_days?: string
}

interface AdminSettingsFormProps {
  adminUser: AdminUser
  settings: Settings
}

// ── Save Hook ───────────────────────────────────────────────────────────────

function useSaveSettings() {
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const save = async (updates: { key: string; value: string }[]) => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      setMsg({ type: res.ok ? "success" : "error", text: data.message || (res.ok ? "Tersimpan" : "Gagal") })
    } catch {
      setMsg({ type: "error", text: "Gagal menyimpan pengaturan" })
    } finally {
      setSaving(false)
    }
  }

  return { save, saving, msg, clearMsg: () => setMsg(null) }
}

// ── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ adminUser }: { adminUser: AdminUser }) {
  const [form, setForm] = useState({
    phone: adminUser.phone ?? "",
    location: adminUser.location ?? "",
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(adminUser.avatar_url)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(adminUser.avatar_url)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      let finalAvatarUrl = avatarUrl

      // Upload avatar if new file selected
      if (avatarFile) {
        const fd = new FormData()
        fd.append("file", avatarFile)
        fd.append("userId", adminUser.id)
        const upRes = await fetch("/api/upload/avatar", { method: "POST", body: fd })
        if (!upRes.ok) {
          const d = await upRes.json()
          setMsg({ type: "error", text: d.message || "Gagal upload avatar" })
          setSaving(false)
          return
        }
        const upData = await upRes.json()
        finalAvatarUrl = upData.url
        setAvatarUrl(finalAvatarUrl)
        setAvatarFile(null)
      }

      const res = await fetch(`/api/users/${adminUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone || null,
          location: form.location || null,
          ...(finalAvatarUrl !== avatarUrl ? { avatar_url: finalAvatarUrl } : {}),
        }),
      })
      const data = await res.json()
      setMsg({ type: res.ok ? "success" : "error", text: res.ok ? "Profil berhasil disimpan" : (data.message || "Gagal menyimpan") })
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-start gap-5">
        <div className="relative shrink-0">
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Avatar"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {adminUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow hover:bg-blue-700"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{adminUser.name}</p>
          <p className="text-sm text-slate-500">{adminUser.email}</p>
          <p className="text-xs text-slate-400 mt-1">Klik ikon kamera untuk ganti foto. Max 2MB (jpg/png/webp).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nama</label>
          <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500">{adminUser.name}</div>
          <p className="text-xs text-slate-400 mt-1">Nama tidak dapat diubah dari sini.</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Email</label>
          <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500">{adminUser.email}</div>
          <p className="text-xs text-slate-400 mt-1">Email tidak dapat diubah dari sini.</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">No. Telepon</label>
          <input
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="+62 812 3456 7890"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Lokasi / Alamat</label>
          <input
            value={form.location}
            onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="Jakarta, Indonesia"
          />
        </div>
      </div>

      <SaveBar saving={saving} msg={msg} />
    </form>
  )
}

// ── Tab: MikroTik ───────────────────────────────────────────────────────────

function MikrotikTab({ settings }: { settings: Settings }) {
  const [form, setForm] = useState({
    mikrotik_host: settings.mikrotik_host ?? "",
    mikrotik_api_port: settings.mikrotik_api_port ?? "8728",
    mikrotik_user: settings.mikrotik_user ?? "",
    mikrotik_pass: settings.mikrotik_pass ?? "",
  })
  const [showPass, setShowPass] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const { save, saving, msg } = useSaveSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await save(Object.entries(form).map(([key, value]) => ({ key, value })))
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/mikrotik/test", { method: "POST" })
      const data = await res.json()
      setTestResult({ ok: data.ok ?? res.ok, msg: data.message || (res.ok ? "Terhubung!" : "Gagal konek") })
    } catch {
      setTestResult({ ok: false, msg: "Tidak dapat terhubung ke server" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Host / IP MikroTik</label>
          <input
            value={form.mikrotik_host}
            onChange={e => setForm(p => ({ ...p, mikrotik_host: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="192.168.1.1"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">API Port</label>
          <input
            value={form.mikrotik_api_port}
            onChange={e => setForm(p => ({ ...p, mikrotik_api_port: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="8728"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Username</label>
          <input
            value={form.mikrotik_user}
            onChange={e => setForm(p => ({ ...p, mikrotik_user: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="admin"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={form.mikrotik_pass}
              onChange={e => setForm(p => ({ ...p, mikrotik_pass: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Test Koneksi
        </button>
        {testResult && (
          <span className={`flex items-center gap-1.5 text-sm font-medium ${testResult.ok ? "text-green-700" : "text-red-600"}`}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {testResult.msg}
          </span>
        )}
      </div>

      <SaveBar saving={saving} msg={msg} />
    </form>
  )
}

// ── Tab: Hotspot ─────────────────────────────────────────────────────────────

function HotspotTab({ settings }: { settings: Settings }) {
  const [form, setForm] = useState({
    hotspot_login_url: settings.hotspot_login_url ?? "",
    company_name: settings.company_name ?? "",
    company_logo_url: settings.company_logo_url ?? "",
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.company_logo_url || null)
  const [uploading, setUploading] = useState(false)
  const { save, saving, msg } = useSaveSettings()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let logoUrl = form.company_logo_url

    if (logoFile) {
      setUploading(true)
      const fd = new FormData()
      fd.append("file", logoFile)
      const upRes = await fetch("/api/upload/logo", { method: "POST", body: fd })
      setUploading(false)
      if (!upRes.ok) return
      const upData = await upRes.json()
      logoUrl = upData.url
      setLogoFile(null)
      setForm(p => ({ ...p, company_logo_url: logoUrl }))
    }

    await save([
      { key: "hotspot_login_url", value: form.hotspot_login_url },
      { key: "company_name", value: form.company_name },
      { key: "company_logo_url", value: logoUrl },
    ])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo Upload */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">Logo Perusahaan</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
            {logoPreview ? (
              <Image src={logoPreview} alt="Logo" width={64} height={64} className="w-full h-full object-contain" />
            ) : (
              <Globe className="w-6 h-6 text-slate-300" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Upload Logo
            </button>
            <p className="text-xs text-slate-400">jpg/png/webp/svg, max 2MB. Tampil di sidebar.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nama Perusahaan</label>
          <input
            value={form.company_name}
            onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="Root.VCR Network"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Login URL Hotspot</label>
          <input
            value={form.hotspot_login_url}
            onChange={e => setForm(p => ({ ...p, hotspot_login_url: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="http://192.168.1.1/login"
          />
          <p className="text-xs text-slate-400 mt-1">URL halaman login MikroTik Hotspot.</p>
        </div>
      </div>
      <SaveBar saving={saving} msg={msg} />
    </form>
  )
}

// ── Tab: Backup ──────────────────────────────────────────────────────────────

function BackupTab({ settings }: { settings: Settings }) {
  const [form, setForm] = useState({
    backup_auto_enabled: settings.backup_auto_enabled ?? "false",
    backup_schedule: settings.backup_schedule ?? "daily",
    backup_retention_days: settings.backup_retention_days ?? "7",
  })
  const [downloading, setDownloading] = useState(false)
  const { save, saving, msg } = useSaveSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await save(Object.entries(form).map(([key, value]) => ({ key, value })))
  }

  const handleManualBackup = () => {
    setDownloading(true)
    setTimeout(() => {
      alert("Backup manual akan diimplementasikan melalui API.")
      setDownloading(false)
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5">
        {/* Auto Backup Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="font-semibold text-slate-900 text-sm">Auto Backup</p>
            <p className="text-xs text-slate-500 mt-0.5">Backup otomatis database secara berkala</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, backup_auto_enabled: p.backup_auto_enabled === "true" ? "false" : "true" }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${form.backup_auto_enabled === "true" ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.backup_auto_enabled === "true" ? "left-7" : "left-1"}`} />
          </button>
        </div>

        {form.backup_auto_enabled === "true" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Jadwal Backup</label>
              <select
                value={form.backup_schedule}
                onChange={e => setForm(p => ({ ...p, backup_schedule: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="hourly">Setiap Jam</option>
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Retensi (hari)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={form.backup_retention_days}
                onChange={e => setForm(p => ({ ...p, backup_retention_days: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Manual Backup */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleManualBackup}
            disabled={downloading}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
            Backup Manual
          </button>
          <p className="text-xs text-slate-400">Download backup database sekarang</p>
        </div>
      </div>
      <SaveBar saving={saving} msg={msg} />
    </form>
  )
}

// ── Tab: Security ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      setMsg({ type: "error", text: "Password baru tidak cocok" })
      return
    }
    if (form.new_password.length < 6) {
      setMsg({ type: "error", text: "Password minimal 6 karakter" })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }),
      })
      const data = await res.json()
      setMsg({ type: res.ok ? "success" : "error", text: data.message || (res.ok ? "Password berhasil diubah" : "Gagal mengubah password") })
      if (res.ok) setForm({ current_password: "", new_password: "", confirm_password: "" })
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
      {[
        { key: "current_password", label: "Password Saat Ini", show: showCurrent, toggle: () => setShowCurrent(v => !v) },
        { key: "new_password", label: "Password Baru", show: showNew, toggle: () => setShowNew(v => !v) },
        { key: "confirm_password", label: "Konfirmasi Password Baru", show: showNew, toggle: () => setShowNew(v => !v) },
      ].map(field => (
        <div key={field.key}>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">{field.label}</label>
          <div className="relative">
            <input
              type={field.show ? "text" : "password"}
              required
              value={(form as Record<string, string>)[field.key]}
              onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button type="button" onClick={field.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ))}

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-100"}`}>
          {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Ubah Password
      </button>
    </form>
  )
}

// ── Danger Zone / Reset ───────────────────────────────────────────────────────

function DangerZone() {
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const handleReset = async () => {
    if (confirm !== "RESET") return
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" })
      const data = await res.json()
      setMsg({ type: res.ok ? "success" : "error", text: data.message || (res.ok ? "Reset berhasil" : "Reset gagal") })
      if (res.ok) {
        setShowDialog(false)
        setConfirm("")
      }
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">Reset Data Operasional</p>
            <p className="text-xs text-red-600 mt-1">Menghapus SEMUA voucher, reseller, wallet log, dan mereset saldo. Aksi ini tidak dapat dibatalkan.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Reset Data
          </button>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-100"}`}>
          {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Konfirmasi Reset Data</h3>
                <p className="text-sm text-slate-500">Aksi ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700">
              Semua <strong>voucher</strong>, <strong>reseller</strong>, <strong>wallet log</strong>, dan <strong>saldo</strong> akan dihapus. Akun admin akan dipertahankan.
            </p>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                Ketik <span className="text-red-600 font-mono">RESET</span> untuk konfirmasi
              </label>
              <input
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                placeholder="RESET"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDialog(false); setConfirm("") }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={confirm !== "RESET" || loading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared SaveBar ────────────────────────────────────────────────────────────

function SaveBar({ saving, msg }: { saving: boolean; msg: { type: "success" | "error"; text: string } | null }) {
  return (
    <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Simpan Pengaturan
      </button>
      {msg && (
        <span className={`flex items-center gap-1.5 text-sm font-medium ${msg.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {msg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </span>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminSettingsForm({ adminUser, settings }: AdminSettingsFormProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "mikrotik" | "hotspot" | "backup" | "security" | "danger">("profile")

  const tabs = [
    { id: "profile", label: "Profil", icon: <User className="w-4 h-4" /> },
    { id: "mikrotik", label: "MikroTik", icon: <Server className="w-4 h-4" /> },
    { id: "hotspot", label: "Hotspot", icon: <Globe className="w-4 h-4" /> },
    { id: "backup", label: "Backup", icon: <HardDrive className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
    { id: "danger", label: "Reset Data", icon: <Trash2 className="w-4 h-4" /> },
  ] as const

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Nav */}
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:w-52 shrink-0 pb-1 lg:pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2.5 lg:px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
              tab.id === "danger"
                ? activeTab === tab.id
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-red-600 hover:bg-red-50"
                : activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.icon}
            <span className="hidden xs:inline lg:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
        {activeTab === "profile" && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Informasi Admin</h3>
            <ProfileTab adminUser={adminUser} />
          </div>
        )}

        {activeTab === "mikrotik" && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Koneksi MikroTik</h3>
            <MikrotikTab settings={settings} />
          </div>
        )}

        {activeTab === "hotspot" && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Pengaturan Hotspot & Branding</h3>
            <HotspotTab settings={settings} />
          </div>
        )}

        {activeTab === "backup" && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Backup & Restore</h3>
            <BackupTab settings={settings} />
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Ubah Password Admin</h3>
            <SecurityTab />
          </div>
        )}

        {activeTab === "danger" && (
          <div className="space-y-4">
            <h3 className="font-bold text-red-700">Danger Zone — Reset Data</h3>
            <DangerZone />
          </div>
        )}
      </div>
    </div>
  )
}
