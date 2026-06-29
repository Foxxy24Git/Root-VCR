import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatRupiah,
  parseVcrIndex,
  resolveIndexToProfile,
  menuText,
  voucherSuccessText,
  parsePaketFromSuccess,
  resolveReplyTarget,
  extractMessageText,
  jidToNumber,
} from './commands.js'

// Daftar paket meniru respons /api/bot/profiles (terurut harga asc).
const profiles = [
  { id: 'p1', name: '1 hari root net', price: 5000, priceFormatted: 'Rp 5.000' },
  { id: 'p2', name: 'Paket 2 Hari', price: 6000, priceFormatted: 'Rp 6.000' },
]

// ── formatRupiah ─────────────────────────────────────────────────────────────
test('formatRupiah: prefiks Rp + pemisah ribuan id-ID', () => {
  assert.equal(formatRupiah(5000), 'Rp 5.000')
  assert.equal(formatRupiah(0), 'Rp 0')
})

// ── parseVcrIndex ────────────────────────────────────────────────────────────
test('parseVcrIndex: ambil nomor paket dari perintah', () => {
  assert.equal(parseVcrIndex('#vcr-1'), 1)
  assert.equal(parseVcrIndex('#vcr-2'), 2)
  assert.equal(parseVcrIndex('  #VCR-3 '), 3)
})

test('parseVcrIndex: bukan perintah nomor → null', () => {
  assert.equal(parseVcrIndex('halo'), null)
  assert.equal(parseVcrIndex('#menu'), null)
  assert.equal(parseVcrIndex('#vcr-'), null)
  assert.equal(parseVcrIndex('#vcr-1hari'), null) // harus angka murni
  assert.equal(parseVcrIndex('#vcr-0'), null) // nomor mulai dari 1
})

// ── resolveIndexToProfile ────────────────────────────────────────────────────
test('resolveIndexToProfile: nomor → paket pada posisi itu', () => {
  assert.equal(resolveIndexToProfile(1, profiles).id, 'p1')
  assert.equal(resolveIndexToProfile(2, profiles).id, 'p2')
})

test('resolveIndexToProfile: di luar rentang / daftar kosong → null', () => {
  assert.equal(resolveIndexToProfile(5, profiles), null)
  assert.equal(resolveIndexToProfile(1, []), null)
})

// ── menuText ─────────────────────────────────────────────────────────────────
test('menuText: daftar paket bernomor dengan perintah #vcr-<n>', () => {
  const txt = menuText('reseler1', profiles)
  assert.match(txt, /reseler1/)
  assert.match(txt, /#saldo/)
  assert.match(txt, /1\. 1 hari root net/)
  assert.match(txt, /Rp 5\.000/)
  assert.match(txt, /#vcr-1/)
  assert.match(txt, /2\. Paket 2 Hari/)
  assert.match(txt, /#vcr-2/)
})

// ── voucherSuccessText + parsePaketFromSuccess ───────────────────────────────
const successV = {
  profileName: '1 hari root net',
  code: 'ABC123',
  password: 'ABC123',
  priceCharged: 5000,
  remainingBalanceFormatted: 'Rp 0',
  mikrotikSynced: true,
}

test('parsePaketFromSuccess: ambil nama paket dari pesan sukses', () => {
  assert.equal(parsePaketFromSuccess(voucherSuccessText(successV)), '1 hari root net')
})

test('parsePaketFromSuccess: pesan menu bukan sukses → null', () => {
  assert.equal(parsePaketFromSuccess(menuText('reseler1', profiles)), null)
})

// ── resolveReplyTarget ───────────────────────────────────────────────────────
test('resolveReplyTarget: reply ke perintah #vcr-2 → paket nomor 2', () => {
  assert.equal(resolveReplyTarget('#vcr-2', profiles).id, 'p2')
})

test('resolveReplyTarget: reply ke pesan sukses → paket (cocok nama)', () => {
  assert.equal(resolveReplyTarget(voucherSuccessText(successV), profiles).id, 'p1')
})

test('resolveReplyTarget: teks tak relevan / kosong → null', () => {
  assert.equal(resolveReplyTarget('terima kasih', profiles), null)
  assert.equal(resolveReplyTarget(null, profiles), null)
})

// ── extractMessageText ───────────────────────────────────────────────────────
test('extractMessageText: berbagai tipe pesan', () => {
  assert.equal(extractMessageText({ conversation: 'hi' }), 'hi')
  assert.equal(extractMessageText({ extendedTextMessage: { text: 'y' } }), 'y')
  assert.equal(extractMessageText(null), null)
})

// ── jidToNumber ──────────────────────────────────────────────────────────────
test('jidToNumber: buang domain & suffix device', () => {
  assert.equal(jidToNumber('628123@s.whatsapp.net'), '628123')
  assert.equal(jidToNumber('628123:12@s.whatsapp.net'), '628123')
})
