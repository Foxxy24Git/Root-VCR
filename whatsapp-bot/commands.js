// Logika perintah bot yang murni (tanpa I/O / tanpa Baileys) agar bisa diuji
// unit dengan `node --test`. index.js memegang socket, klien API, & mapping JID.

// Error dari klien API internal (/api/bot/*); membawa status HTTP.
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ── Format ────────────────────────────────────────────────────────────────────
// Samakan dengan formatRupiah di aplikasi (src/lib/utils.ts).
export function formatRupiah(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
}

// ── Perintah voucher berbasis NOMOR urut paket ────────────────────────────────
// Data paket tidak punya durasi terstruktur yang andal & bisa kembar, jadi
// dipilih per nomor pada daftar #menu (terurut harga asc dari API).
//
// Ekstrak nomor dari perintah "#vcr-<n>" (angka murni). Bukan perintah → null.
export function parseVcrIndex(text) {
  const m = (text || '').trim().match(/^#vcr-(\d+)$/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return n >= 1 ? n : null
}

// Ambil paket pada posisi `index` (1-based). Di luar rentang → null.
export function resolveIndexToProfile(index, profiles) {
  const list = profiles || []
  if (!Number.isInteger(index) || index < 1 || index > list.length) return null
  return list[index - 1]
}

// ── Teks balasan ───────────────────────────────────────────────────────────────
export function menuText(name, profiles) {
  const lines = (profiles || []).map(
    (p, i) => `${i + 1}. ${p.name} — ${p.priceFormatted} → ketik #vcr-${i + 1}`
  )
  return (
    `Halo ${name}! 👋\n` +
    `💰 Cek saldo: ketik #saldo\n\n` +
    `📦 Paket voucher kamu:\n` +
    `${lines.join('\n')}\n\n` +
    `💡 Sudah pernah buat? Balas (reply) pesan voucher/perintahnya dengan "Y".`
  )
}

export function voucherSuccessText(v) {
  const harga = v.priceCharged === 0 ? 'Gratis' : formatRupiah(v.priceCharged)
  let text =
    `✅ Voucher berhasil dibuat!\n\n` +
    `📦 Paket: ${v.profileName}\n` +
    `🎫 Kode: ${v.code}\n` +
    `🔑 Password: ${v.password}\n` +
    `💵 Harga: ${harga}\n` +
    `💰 Sisa saldo: ${v.remainingBalanceFormatted}`
  if (!v.mikrotikSynced) {
    text +=
      `\n\n⚠️ Catatan: voucher belum tersinkron ke router. ` +
      `Voucher tetap tersimpan, hubungi admin bila tidak bisa dipakai.`
  }
  return text
}

// ── Reply + Y/y ─────────────────────────────────────────────────────────────────
// Ambil nama paket dari pesan sukses voucher (baris "📦 Paket: <nama>").
export function parsePaketFromSuccess(text) {
  const m = (text || '').match(/Paket:\s*([^\n]+)/)
  return m ? m[1].trim() : null
}

// Tentukan paket target saat reseller membalas sebuah pesan dengan "Y"/"y".
// Prioritas: perintah #vcr-<n> → nomor; lalu pesan sukses → cocok nama paket.
export function resolveReplyTarget(quotedText, profiles) {
  if (!quotedText) return null

  const index = parseVcrIndex(quotedText)
  if (index) return resolveIndexToProfile(index, profiles)

  const paketName = parsePaketFromSuccess(quotedText)
  if (paketName) {
    const wanted = paketName.toLowerCase()
    return (profiles || []).find((p) => p.name.trim().toLowerCase() === wanted) || null
  }
  return null
}

// ── Util WhatsApp (murni) ─────────────────────────────────────────────────────
// Ambil isi teks dari berbagai tipe pesan WhatsApp.
export function extractMessageText(message) {
  if (!message) return null
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.buttonsResponseMessage?.selectedButtonId ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    null
  )
}

// Normalisasi JID -> nomor digit (buang domain & suffix device ":12").
export function jidToNumber(jid) {
  return (jid || '').split('@')[0].split(':')[0] || ''
}

// Konstanta pesan statis.
export const TXT = {
  notRegistered:
    'Nomor WhatsApp Anda belum terhubung ke Root-VCR. 🙏\n\n' +
    'Ketik perintah berikut untuk mendaftar:\n' +
    '*#daftar 08xxxxxxxxxx*\n\n' +
    'Ganti *08xxxxxxxxxx* dengan nomor HP yang terdaftar di Root-VCR.',
  frozen: 'Maaf, akun Anda sedang dibekukan. 🧊\nSilakan hubungi admin.',
  unknown: 'Perintah tidak dikenali.\nKetik *#menu* untuk melihat menu & daftar paket.',
  noProfiles:
    'Saat ini belum ada paket voucher yang tersedia untuk Anda.\nSilakan hubungi admin.',
  replyHint:
    'Untuk generate ulang, *reply* pesan voucher atau perintah *#vcr-...* lalu ketik *Y*.\n' +
    'Atau ketik *#menu* untuk melihat daftar paket.',
  genericError:
    'Maaf, terjadi kesalahan pada sistem. 🙏\nSilakan coba lagi beberapa saat.',
}
