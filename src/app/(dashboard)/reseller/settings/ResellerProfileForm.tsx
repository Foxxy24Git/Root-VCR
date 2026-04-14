"use client"

import * as React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import { Camera, Loader2, CheckCircle2, AlertCircle, User } from "lucide-react"

interface ResellerUser {
  id: string
  name: string
  email: string
  phone: string | null
  location: string | null
  avatar_url: string | null
}

export function ResellerProfileForm({ user }: { user: ResellerUser }) {
  const [form, setForm] = useState({
    phone: user.phone ?? "",
    location: user.location ?? "",
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
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
      let finalAvatarUrl: string | null = user.avatar_url

      if (avatarFile) {
        const fd = new FormData()
        fd.append("file", avatarFile)
        fd.append("userId", user.id)
        const upRes = await fetch("/api/upload/avatar", { method: "POST", body: fd })
        if (!upRes.ok) {
          const d = await upRes.json()
          setMsg({ type: "error", text: d.message || "Gagal upload avatar" })
          setSaving(false)
          return
        }
        const upData = await upRes.json()
        finalAvatarUrl = upData.url
        setAvatarFile(null)
      }

      const body: Record<string, unknown> = {
        phone: form.phone || null,
        location: form.location || null,
      }
      if (finalAvatarUrl !== user.avatar_url) {
        body.avatar_url = finalAvatarUrl
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setMsg({
        type: res.ok ? "success" : "error",
        text: res.ok ? "Profil berhasil disimpan" : (data.message || "Gagal menyimpan"),
      })
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
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow hover:bg-blue-700"
          >
            <Camera className="w-3.5 h-3.5" />
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
          <p className="font-semibold text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="text-xs text-slate-400 mt-1">Klik ikon kamera untuk ganti foto. Max 2MB.</p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Nama Lengkap
          </label>
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            {user.name}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Email
          </label>
          <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500">
            {user.email}
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">No. Telepon</label>
          <input
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            placeholder="+62 812 3456 7890"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Lokasi / Alamat</label>
          <input
            value={form.location}
            onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            placeholder="Jakarta, Indonesia"
          />
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
          msg.type === "success"
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-red-50 text-red-600 border-red-100"
        }`}>
          {msg.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan Profil
        </button>
      </div>
    </form>
  )
}
