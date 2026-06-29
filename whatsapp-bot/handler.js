// Orkestrasi perintah bot. Tidak meng-import Baileys: `sock` & `deps` (api +
// registerJid) di-inject oleh index.js, sehingga handler ini bisa diuji unit.

import {
  ApiError,
  TXT,
  jidToNumber,
  menuText,
  voucherSuccessText,
  parseVcrIndex,
  resolveIndexToProfile,
  resolveReplyTarget,
} from './commands.js'

// Generate satu voucher untuk paket terpilih lalu balas hasil/error.
async function generateAndReply(sock, jid, sender, profile, api) {
  try {
    const result = await api.generateVoucher(sender, profile.id)
    await sock.sendMessage(jid, { text: voucherSuccessText(result) })
  } catch (err) {
    // Error bisnis dari API (saldo kurang, akses ditolak, dll) → tampilkan pesannya.
    const msg =
      err instanceof ApiError
        ? `⚠️ Gagal generate voucher.\n${err.message}`
        : TXT.genericError
    await sock.sendMessage(jid, { text: msg })
  }
}

/**
 * Inti command handler: dipanggil per pesan teks dari chat pribadi.
 * @param sock       Baileys socket (punya sendMessage)
 * @param jid        remoteJid tujuan balasan
 * @param sender     nomor pengirim ter-resolve (mis. "628...")
 * @param rawText    teks pesan masuk
 * @param quotedText teks pesan yang di-reply (null bila bukan reply)
 * @param deps       { api, registerJid }
 */
export async function handleCommand(sock, jid, sender, rawText, quotedText, deps) {
  const { api, registerJid } = deps
  const text = rawText.trim()
  const lower = text.toLowerCase()

  // 0) #daftar sebelum identify (untuk link WA JID ke nomor HP).
  const daftarMatch = text.match(/^#daftar\s+(\d+)$/i)
  if (daftarMatch) {
    const phoneInput = daftarMatch[1]
    try {
      const found = await api.identify(phoneInput)
      registerJid(jidToNumber(jid), phoneInput)
      await sock.sendMessage(jid, {
        text: `✅ Berhasil terhubung sebagai *${found.name}*!\n\nKetik *#menu* untuk melihat menu.`,
      })
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 404
          ? '❌ Nomor tidak ditemukan di Root-VCR. Pastikan nomor sudah didaftarkan oleh admin.'
          : TXT.genericError
      await sock.sendMessage(jid, { text: msg })
    }
    return
  }

  // 1) Verifikasi nomor terdaftar untuk SETIAP pesan.
  let user
  try {
    user = await api.identify(sender)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await sock.sendMessage(jid, { text: TXT.notRegistered })
      return
    }
    throw err
  }

  if (user.isFrozen) {
    await sock.sendMessage(jid, { text: TXT.frozen })
    return
  }

  // 2) #menu — satu-satunya tempat lihat daftar paket.
  if (lower === '#menu') {
    const profiles = await api.profiles(sender)
    if (!Array.isArray(profiles) || profiles.length === 0) {
      await sock.sendMessage(jid, { text: TXT.noProfiles })
      return
    }
    await sock.sendMessage(jid, { text: menuText(user.name, profiles) })
    return
  }

  // 3) #saldo
  if (lower === '#saldo') {
    const { balanceFormatted } = await api.balance(sender)
    await sock.sendMessage(jid, { text: `💰 Saldo kamu: ${balanceFormatted}` })
    return
  }

  // 4) Reply + "Y"/"y" → ulangi generate dari pesan yang di-reply.
  if (lower === 'y') {
    if (!quotedText) {
      await sock.sendMessage(jid, { text: TXT.replyHint })
      return
    }
    const profiles = await api.profiles(sender)
    const target = resolveReplyTarget(quotedText, profiles)
    if (!target) {
      await sock.sendMessage(jid, { text: TXT.replyHint })
      return
    }
    await generateAndReply(sock, jid, sender, target, api)
    return
  }

  // 5) #vcr-<nomor> → generate langsung paket nomor itu dari #menu.
  const index = parseVcrIndex(text)
  if (index) {
    const profiles = await api.profiles(sender)
    const picked = resolveIndexToProfile(index, profiles)
    if (!picked) {
      await sock.sendMessage(jid, {
        text: `Paket nomor *${index}* tidak ada.\nKetik *#menu* untuk lihat paket kamu.`,
      })
      return
    }
    await generateAndReply(sock, jid, sender, picked, api)
    return
  }

  // 6) Tidak dikenali.
  await sock.sendMessage(jid, { text: TXT.unknown })
}
