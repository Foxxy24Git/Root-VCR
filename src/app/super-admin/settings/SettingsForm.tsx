"use client"

import * as React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import {
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Phone,
  MapPin,
  KeyRound,
  Save,
} from "lucide-react"

interface SuperAdminUser {
  id: string
  name: string
  email: string
  phone: string | null
  location: string | null
  avatar_url: string | null
}

export function SettingsForm({ initialUser }: { initialUser: SuperAdminUser }) {
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: initialUser.name,
    email: initialUser.email,
    phone: initialUser.phone ?? "",
    location: initialUser.location ?? "",
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialUser.avatar_url)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      let finalAvatarUrl: string | null = initialUser.avatar_url

      if (avatarFile) {
        const fd = new FormData()
        fd.append("file", avatarFile)
        fd.append("userId", initialUser.id)
        const upRes = await fetch("/api/upload/avatar", { method: "POST", body: fd })
        if (!upRes.ok) {
          const d = await upRes.json()
          setProfileMsg({ type: "error", text: d.message || "Gagal upload avatar" })
          setSavingProfile(false)
          return
        }
        const upData = await upRes.json()
        finalAvatarUrl = upData.url
        setAvatarFile(null)
      }

      const body = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone || null,
        location: profileForm.location || null,
        avatar_url: finalAvatarUrl,
      }

      const res = await fetch("/api/super-admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan profil")
      }

      setProfileMsg({
        type: "success",
        text: "Profil Super Admin berhasil diperbarui!",
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setProfileMsg({ type: "error", text: err.message })
      } else {
        setProfileMsg({ type: "error", text: "Terjadi kesalahan saat menyimpan profil" })
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: "error", text: "Konfirmasi password baru tidak cocok" })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password baru minimal 6 karakter" })
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal mengubah password")
      }

      setPasswordMsg({ type: "success", text: "Password berhasil diperbarui!" })
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordMsg({ type: "error", text: err.message })
      } else {
        setPasswordMsg({ type: "error", text: "Terjadi kesalahan saat mengubah password" })
      }
    } finally {
      setChangingPassword(false)
    }
  }

  const labelCls = "text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5"
  const inputCls = "w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"

  return (
    <div className="grid grid-cols-1 gap-6">
      
      {/* Profil Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Informasi Profil
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Perbarui data diri akun Super Admin Anda.
          </p>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-5 pb-4 border-b border-slate-100 dark:border-slate-700/50">
            <div className="relative shrink-0">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : "S"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                title="Ganti Foto"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Foto Profil Super Admin
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Dukung JPG, PNG, atau WEBP. Maksimum 2MB.
              </p>
            </div>
          </div>

          {/* Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Nama Lengkap</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-slate-400" />
                </span>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                  className={`${inputCls} pl-10`}
                  placeholder="Nama Lengkap"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                </span>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                  className={`${inputCls} pl-10`}
                  placeholder="admin@domain.com"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>No. Telepon</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-4.5 w-4.5 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  className={`${inputCls} pl-10`}
                  placeholder="+62 812 3456 789"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Lokasi / Kota</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MapPin className="h-4.5 w-4.5 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                  className={`${inputCls} pl-10`}
                  placeholder="Jakarta, Indonesia"
                />
              </div>
            </div>
          </div>

          {/* Profile Status Messages */}
          {profileMsg && (
            <div className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm border transition-all ${
              profileMsg.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50"
                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/50"
            }`}>
              {profileMsg.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              {savingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Simpan Profil
            </button>
          </div>
        </form>
      </div>

      {/* Keamanan Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Ubah Password
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Ganti password akun Super Admin Anda secara berkala demi keamanan.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Password Saat Ini</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="h-4.5 w-4.5 text-slate-400" />
                </span>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  className={`${inputCls} pl-10`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Password Baru</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-4.5 w-4.5 text-slate-400" />
                  </span>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    className={`${inputCls} pl-10`}
                    placeholder="Minimal 6 karakter"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Konfirmasi Password Baru</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-4.5 w-4.5 text-slate-400" />
                  </span>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className={`${inputCls} pl-10`}
                    placeholder="Ulangi password baru"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Password Status Messages */}
          {passwordMsg && (
            <div className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm border transition-all ${
              passwordMsg.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50"
                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/50"
            }`}>
              {passwordMsg.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white disabled:opacity-50 disabled:pointer-events-none text-white dark:text-slate-900 px-6 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Ubah Password
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
