import { readFileSync } from 'node:fs'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { ApiError, extractMessageText, jidToNumber, TXT } from './commands.js'
import { handleCommand } from './handler.js'

// Map LID → nomor HP (format 628xxx)
// WhatsApp Business menggunakan LID sebagai pengganti nomor untuk privasi
const lidToPhone = new Map()

// ── Persistent JID → phone mapping (untuk handle WA Business LID) ───────────
import { writeFileSync, existsSync } from 'node:fs'
const JID_MAP_PATH = new URL('./jid_map.json', import.meta.url).pathname

function loadJidMap() {
  try {
    if (!existsSync(JID_MAP_PATH)) return new Map()
    const data = JSON.parse(readFileSync(JID_MAP_PATH, 'utf8'))
    return new Map(Object.entries(data))
  } catch { return new Map() }
}

function saveJidMap(map) {
  writeFileSync(JID_MAP_PATH, JSON.stringify(Object.fromEntries(map), null, 2))
}

const jidMap = loadJidMap() // rawJid (LID/nomor) → phone (format 08xxx)

// ── Konfigurasi (.env di folder whatsapp-bot/) ──────────────────────────────
// Loader .env minimal & tanpa dependency: cukup untuk KEY=VALUE sederhana.
// Variabel yang sudah ada di process.env (mis. di-export shell) tidak ditimpa.
function loadEnv() {
  const envPath = new URL('./.env', import.meta.url).pathname
  let raw
  try {
    raw = readFileSync(envPath, 'utf8')
  } catch {
    return // tidak ada file .env — andalkan env dari shell/host
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Lepas tanda kutip pembungkus jika ada.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

loadEnv()

const BASE_URL = (process.env.BASE_URL || '').replace(/\/+$/, '')
const BOT_API_SECRET = process.env.BOT_API_SECRET || ''

if (!BASE_URL || !BOT_API_SECRET) {
  console.error(
    '❌ Konfigurasi belum lengkap. Set BASE_URL & BOT_API_SECRET di whatsapp-bot/.env\n' +
      '   (lihat whatsapp-bot/.env.example).'
  )
  process.exit(1)
}

// Folder tempat auth/session disimpan. Selama folder ini ada & valid,
// bot tidak perlu scan QR ulang setiap restart.
const AUTH_DIR = new URL('./auth_state', import.meta.url).pathname

// ── Klien API internal (/api/bot/*) ─────────────────────────────────────────
async function apiRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'x-bot-secret': BOT_API_SECRET,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    // respons non-JSON (mis. halaman error) — biarkan data null
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `HTTP ${res.status}`
    throw new ApiError(message, res.status)
  }
  return data
}

const api = {
  // GET /api/bot/identify → { id, name, role, tenantId, isFrozen }  (404 = belum terdaftar)
  identify: (phone) =>
    apiRequest(`/api/bot/identify?phone=${encodeURIComponent(phone)}`),
  // GET /api/bot/balance → { balance, balanceFormatted }
  balance: (phone) =>
    apiRequest(`/api/bot/balance?phone=${encodeURIComponent(phone)}`),
  // GET /api/bot/profiles → [{ id, name, durationDays, durationHours, price, priceFormatted }]
  profiles: (phone) =>
    apiRequest(`/api/bot/profiles?phone=${encodeURIComponent(phone)}`),
  // POST /api/bot/generate-voucher → { code, password, profileName, priceCharged, remainingBalanceFormatted, mikrotikSynced }
  generateVoucher: (phone, profileId) =>
    apiRequest('/api/bot/generate-voucher', {
      method: 'POST',
      body: { phone, profileId },
    }),
}

// Simpan mapping WA JID → nomor HP saat reseller mendaftar via #daftar.
function registerJid(rawJid, phone) {
  jidMap.set(rawJid, phone)
  saveJidMap(jidMap)
  console.log(`🔗 JID registered: ${rawJid} → ${phone}`)
}

// Dependency yang di-inject ke handler (memudahkan unit test handler.js).
const deps = { api, registerJid }

// Resolve sender: coba jidMap (persisted) → lidToPhone → raw
function resolveSender(jid) {
  const raw = jidToNumber(jid)
  if (jidMap.has(raw)) return jidMap.get(raw)
  if (lidToPhone.has(raw)) return lidToPhone.get(raw)
  return raw
}

// Ambil teks pesan yang di-reply (quoted), bila ada — untuk fitur reply + "Y".
function getQuotedText(message) {
  const ctx =
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    null
  const quoted = ctx?.quotedMessage
  return quoted ? extractMessageText(quoted) : null
}

async function startBot() {
  // Multi-file auth state: kredensial & keys disimpan sebagai file di AUTH_DIR.
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

  // Pakai versi protokol WhatsApp terbaru yang dikenali Baileys.
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`Menggunakan WA v${version.join('.')} (terbaru: ${isLatest})`)

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // senyapkan log internal Baileys
    browser: ['Root-VCR Bot', 'Chrome', '1.0.0'],
  })

  // Simpan kredensial setiap kali ada update (penting untuk session persistence).
  sock.ev.on('creds.update', saveCreds)

  // Build LID → phone mapping saat kontak disinkronisasi
  // WA Business menggunakan LID (angka panjang acak) sebagai pengganti nomor HP
  const handleContacts = (contacts) => {
    for (const c of contacts) {
      if (!c.id) continue
      // c.id bisa berupa "6282288231533@s.whatsapp.net" (nomor) atau LID
      // c.lid berupa LID jika c.id adalah nomor HP
      if (c.lid) {
        const phone = jidToNumber(c.id)   // nomor HP (628xxx)
        const lid   = jidToNumber(c.lid)  // LID (79590173217013)
        if (phone && lid) {
          lidToPhone.set(lid, phone)
          console.log(`🔗 LID mapped: ${lid} → ${phone}`)
        }
      }
    }
  }
  sock.ev.on('contacts.set',    ({ contacts }) => handleContacts(contacts))
  sock.ev.on('contacts.upsert', handleContacts)
  sock.ev.on('contacts.update', handleContacts)

  // Status koneksi + QR code.
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('\n📱 Scan QR berikut via WhatsApp > Perangkat Tertaut (Linked Devices):\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'connecting') {
      console.log('… menghubungkan ke WhatsApp')
    }

    if (connection === 'open') {
      console.log('✅ Bot WhatsApp terhubung & siap menerima pesan.')
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut

      if (loggedOut) {
        console.log(
          '🚪 Sesi logged out. Hapus folder auth_state/ lalu jalankan ulang untuk scan QR baru.'
        )
        return
      }

      console.log(`⚠️  Koneksi terputus (code: ${statusCode}). Mencoba reconnect…`)
      startBot()
    }
  })

  // Pesan masuk -> jalankan command handler.
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    // 'notify' = pesan baru real-time. 'append' biasanya history/sync, kita abaikan.
    if (type !== 'notify') return

    for (const msg of messages) {
      if (!msg.message) continue
      if (msg.key.fromMe) continue // abaikan pesan yang dikirim oleh bot sendiri

      const remoteJid = msg.key.remoteJid || ''
      const isGroup = remoteJid.endsWith('@g.us')
      const isBroadcast = remoteJid === 'status@broadcast' || remoteJid.endsWith('@broadcast')

      const text = extractMessageText(msg.message)
      const quotedText = getQuotedText(msg.message)
      const sender = resolveSender(isGroup ? msg.key.participant : remoteJid)
      const label = isGroup ? `${sender} (di grup ${jidToNumber(remoteJid)})` : sender
      console.log(`📩 Pesan dari ${label}: ${text ?? '[pesan non-teks]'}`)

      // Flow voucher hanya untuk chat pribadi: state di-key per nomor pengirim,
      // dan kita tidak ingin bot membalas ramai di grup / status.
      if (isGroup || isBroadcast) continue
      if (!text || !sender) continue

      // Tangkap SEMUA error agar bot tidak pernah crash karena satu pesan.
      handleCommand(sock, remoteJid, sender, text, quotedText, deps).catch(async (err) => {
        console.error(`❌ Error menangani pesan dari ${sender}:`, err)
        try {
          await sock.sendMessage(remoteJid, { text: TXT.genericError })
        } catch (sendErr) {
          console.error('❌ Gagal mengirim pesan error:', sendErr)
        }
      })
    }
  })

  return sock
}

// Jalankan hanya saat file dieksekusi langsung (`node index.js`).
const isMain = process.argv[1] === new URL(import.meta.url).pathname
if (isMain) {
  startBot().catch((err) => {
    console.error('❌ Gagal menjalankan bot:', err)
    process.exit(1)
  })
}

export { startBot }
