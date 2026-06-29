import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleCommand } from './handler.js'
import { ApiError, voucherSuccessText } from './commands.js'

// Terurut harga asc (seperti respons API). #vcr-1 = termurah, dst.
const profiles = [
  { id: 'p1', name: '1 hari root net', price: 5000, priceFormatted: 'Rp 5.000' },
  { id: 'p2', name: 'Paket 2 Hari', price: 6000, priceFormatted: 'Rp 6.000' },
]

const successV = {
  profileName: '1 hari root net',
  code: 'ABC123',
  password: 'ABC123',
  priceCharged: 5000,
  remainingBalance: 0,
  remainingBalanceFormatted: 'Rp 0',
  mikrotikSynced: true,
}

// Fake socket: rekam semua teks yang dikirim.
function makeSock() {
  const sent = []
  return {
    sent,
    async sendMessage(_jid, { text }) {
      sent.push(text)
    },
    last() {
      return sent[sent.length - 1]
    },
  }
}

// Fake api + deps yang bisa di-override per test.
function makeDeps(overrides = {}) {
  const genCalls = []
  const registered = []
  const api = {
    identify: overrides.identify || (async () => ({ name: 'reseler1', isFrozen: false, role: 'RESELLER' })),
    balance: overrides.balance || (async () => ({ balanceFormatted: 'Rp 1.000' })),
    profiles: overrides.profiles || (async () => profiles),
    generateVoucher:
      overrides.generateVoucher ||
      (async () => ({ ...successV })),
  }
  // bungkus generateVoucher agar selalu merekam argumen panggilan.
  const orig = api.generateVoucher
  api.generateVoucher = async (phone, profileId) => {
    genCalls.push({ phone, profileId })
    return orig(phone, profileId)
  }
  const registerJid = (rawJid, phone) => registered.push({ rawJid, phone })
  return { deps: { api, registerJid }, genCalls, registered }
}

const JID = '628999@s.whatsapp.net'
const SENDER = '628999'

test('nomor belum terdaftar (identify 404) → pesan notRegistered', async () => {
  const sock = makeSock()
  const { deps } = makeDeps({
    identify: async () => {
      throw new ApiError('not found', 404)
    },
  })
  await handleCommand(sock, JID, SENDER, 'halo', null, deps)
  assert.match(sock.last(), /belum terhubung ke Root-VCR/)
})

test('akun beku → pesan frozen', async () => {
  const sock = makeSock()
  const { deps } = makeDeps({ identify: async () => ({ name: 'reseler1', isFrozen: true }) })
  await handleCommand(sock, JID, SENDER, '#menu', null, deps)
  assert.match(sock.last(), /dibekukan/)
})

test('#menu → daftar paket bernomor', async () => {
  const sock = makeSock()
  const { deps } = makeDeps()
  await handleCommand(sock, JID, SENDER, '#menu', null, deps)
  assert.match(sock.last(), /1\. 1 hari root net/)
  assert.match(sock.last(), /#vcr-1/)
  assert.match(sock.last(), /#vcr-2/)
})

test('#menu tanpa paket → pesan noProfiles', async () => {
  const sock = makeSock()
  const { deps } = makeDeps({ profiles: async () => [] })
  await handleCommand(sock, JID, SENDER, '#menu', null, deps)
  assert.match(sock.last(), /belum ada paket/)
})

test('#saldo → tampilkan saldo', async () => {
  const sock = makeSock()
  const { deps } = makeDeps()
  await handleCommand(sock, JID, SENDER, '#saldo', null, deps)
  assert.match(sock.last(), /Rp 1\.000/)
})

test('#vcr-1 → generate paket nomor 1 (termurah) & balas sukses', async () => {
  const sock = makeSock()
  const { deps, genCalls } = makeDeps()
  await handleCommand(sock, JID, SENDER, '#vcr-1', null, deps)
  assert.deepEqual(genCalls, [{ phone: SENDER, profileId: 'p1' }])
  assert.match(sock.last(), /Voucher berhasil dibuat/)
})

test('#vcr-2 → generate paket nomor 2', async () => {
  const sock = makeSock()
  const { deps, genCalls } = makeDeps()
  await handleCommand(sock, JID, SENDER, '#vcr-2', null, deps)
  assert.deepEqual(genCalls, [{ phone: SENDER, profileId: 'p2' }])
})

test('#vcr-9 (di luar rentang) → pesan tidak ada, tidak generate', async () => {
  const sock = makeSock()
  const { deps, genCalls } = makeDeps()
  await handleCommand(sock, JID, SENDER, '#vcr-9', null, deps)
  assert.equal(genCalls.length, 0)
  assert.match(sock.last(), /tidak ada/)
})

test('reply "y" ke perintah #vcr-2 → generate paket nomor 2', async () => {
  const sock = makeSock()
  const { deps, genCalls } = makeDeps()
  await handleCommand(sock, JID, SENDER, 'y', '#vcr-2', deps)
  assert.deepEqual(genCalls, [{ phone: SENDER, profileId: 'p2' }])
})

test('reply "Y" ke pesan sukses voucher → generate paket yang sama (cocok nama)', async () => {
  const sock = makeSock()
  const { deps, genCalls } = makeDeps()
  await handleCommand(sock, JID, SENDER, 'Y', voucherSuccessText(successV), deps)
  assert.deepEqual(genCalls, [{ phone: SENDER, profileId: 'p1' }])
})

test('"y" tanpa reply → hint, tidak generate', async () => {
  const sock = makeSock()
  const { deps, genCalls } = makeDeps()
  await handleCommand(sock, JID, SENDER, 'y', null, deps)
  assert.equal(genCalls.length, 0)
  assert.match(sock.last(), /reply/i)
})

test('"y" reply ke pesan tak relevan → hint', async () => {
  const sock = makeSock()
  const { deps, genCalls } = makeDeps()
  await handleCommand(sock, JID, SENDER, 'y', 'terima kasih', deps)
  assert.equal(genCalls.length, 0)
  assert.match(sock.last(), /reply/i)
})

test('perintah tak dikenal → pesan unknown', async () => {
  const sock = makeSock()
  const { deps } = makeDeps()
  await handleCommand(sock, JID, SENDER, 'asdf', null, deps)
  assert.match(sock.last(), /tidak dikenali/)
})

test('error bisnis dari API saat generate → tampilkan pesannya', async () => {
  const sock = makeSock()
  const { deps } = makeDeps({
    generateVoucher: async () => {
      throw new ApiError('Saldo tidak cukup. Dibutuhkan Rp 5.000', 402)
    },
  })
  await handleCommand(sock, JID, SENDER, '#vcr-1', null, deps)
  assert.match(sock.last(), /Gagal generate/)
  assert.match(sock.last(), /Saldo tidak cukup/)
})

test('#daftar <nomor> sukses → registerJid + pesan terhubung', async () => {
  const sock = makeSock()
  const { deps, registered } = makeDeps({
    identify: async () => ({ name: 'reseler1', isFrozen: false }),
  })
  await handleCommand(sock, JID, SENDER, '#daftar 08123456789', null, deps)
  assert.deepEqual(registered, [{ rawJid: '628999', phone: '08123456789' }])
  assert.match(sock.last(), /Berhasil terhubung/)
})
