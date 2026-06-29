import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getTenantPrisma } from "@/lib/prisma-tenant"
import { assertBotAuth } from "@/lib/bot-auth"
import {
  generateVoucherCode,
  generateRandomPassword,
  calculateResellerPrice,
  formatRupiah,
} from "@/lib/utils"
import { createHotspotUser } from "@/services/mikrotik.service"

// POST /api/bot/generate-voucher
// Body: { phone: string, profileId: string }
//
// Server-to-server endpoint for the WhatsApp bot. Replicates the business logic
// of POST /api/vouchers/generate (we don't call that route because it's behind a
// same-origin CSRF guard). Auth is the shared `x-bot-secret` header instead of a
// NextAuth session, and the acting user is resolved from their phone number.
//
// Quantity is always 1 — the bot generates vouchers one at a time.
//   - TENANT_ADMIN → gratis (price_charged = 0, wallet tidak dipotong)
//   - RESELLER     → potong wallet sesuai harga reseller
export async function POST(req: NextRequest) {
  const unauth = assertBotAuth(req)
  if (unauth) return unauth

  // ── Parse & validate body ────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Body tidak valid" },
      { status: 400 },
    )
  }

  const { phone, profileId } = (body ?? {}) as {
    phone?: unknown
    profileId?: unknown
  }
  if (typeof phone !== "string" || !phone.trim()) {
    return NextResponse.json(
      { error: "Bad Request", message: "Field 'phone' wajib diisi" },
      { status: 400 },
    )
  }
  if (typeof profileId !== "string" || !profileId.trim()) {
    return NextResponse.json(
      { error: "Bad Request", message: "Field 'profileId' wajib diisi" },
      { status: 400 },
    )
  }

  // ── Identify user from phone (global lookup) ───────────────────────────────
  const user = await prisma.user.findFirst({
    where: { phone: phone.trim() },
    select: {
      id: true,
      role: true,
      tenant_id: true,
      is_frozen: true,
      is_active: true,
      fee_percentage: true,
    },
  })

  if (!user) {
    return NextResponse.json(
      { error: "Not Found", message: "Nomor tidak terdaftar di Root-VCR" },
      { status: 404 },
    )
  }
  if (user.is_frozen) {
    return NextResponse.json(
      { error: "Forbidden", message: "Akun Anda dibekukan" },
      { status: 403 },
    )
  }
  if (!user.is_active) {
    return NextResponse.json(
      { error: "Forbidden", message: "Akun Anda tidak aktif" },
      { status: 403 },
    )
  }
  if (!user.tenant_id) {
    return NextResponse.json(
      { error: "Bad Request", message: "User tidak terikat ke tenant manapun" },
      { status: 400 },
    )
  }

  const tenantId = user.tenant_id
  const db = getTenantPrisma(tenantId)

  // ── Validate profile (tenant-scoped, must be active) ───────────────────────
  const profile = await db.profile.findFirst({
    where: { id: profileId, is_active: true },
  })
  if (!profile) {
    return NextResponse.json(
      { error: "Not Found", message: "Profile tidak ditemukan" },
      { status: 404 },
    )
  }

  const basePrice = Number(profile.price)

  // ── Validate access + compute price per role ───────────────────────────────
  // priceCharged: TENANT_ADMIN gratis (0), RESELLER = harga reseller.
  let priceCharged = 0
  if (user.role === "RESELLER") {
    const access = await db.resellerProfile.findUnique({
      where: { user_id_profile_id: { user_id: user.id, profile_id: profileId } },
    })
    if (!access || !access.is_enabled) {
      return NextResponse.json(
        { error: "Forbidden", message: "Anda tidak memiliki akses ke profile ini" },
        { status: 403 },
      )
    }

    const feePercentage = Number(user.fee_percentage ?? 0)
    const { resellerPrice } = calculateResellerPrice(basePrice, feePercentage)
    priceCharged = resellerPrice

    const wallet = await db.wallet.findUnique({ where: { user_id: user.id } })
    if (!wallet || Number(wallet.balance) < priceCharged) {
      return NextResponse.json(
        {
          error: "Insufficient Balance",
          message: `Saldo tidak cukup. Dibutuhkan ${formatRupiah(priceCharged)}, saldo: ${formatRupiah(Number(wallet?.balance ?? 0))}`,
        },
        { status: 402 },
      )
    }
  } else if (user.role !== "TENANT_ADMIN") {
    // SUPER_ADMIN (or any other role) has no business generating tenant vouchers here.
    return NextResponse.json(
      { error: "Forbidden", message: "Role Anda tidak dapat generate voucher" },
      { status: 403 },
    )
  }

  // ── Voucher code/password settings (tenant-scoped) ─────────────────────────
  const settings = await db.setting.findMany({
    where: {
      key: {
        in: [
          "voucher_prefix",
          "voucher_code_length",
          "voucher_code_format",
          "voucher_username_equals_password",
          "voucher_password_prefix",
        ],
      },
    },
  })
  const getSetting = (key: string, def: string) =>
    settings.find((s) => s.key === key)?.value ?? def

  const prefix = getSetting("voucher_prefix", "")
  const codeLen = parseInt(getSetting("voucher_code_length", "8"))
  const format = getSetting("voucher_code_format", "alphanumeric_upper") as
    | "alphanumeric_upper"
    | "alphanumeric_lower"
    | "alphanumeric_mixed"
    | "numeric"
    | "alpha"
  const usernameEqualsPassword =
    getSetting("voucher_username_equals_password", "true") === "true"
  const passwordPrefix = getSetting("voucher_password_prefix", "")

  // ── Generate a unique code (code is GLOBALly unique → check via `prisma`) ──
  let code = ""
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateVoucherCode(prefix, codeLen, format)
    const clash = await prisma.voucher.findUnique({
      where: { code: candidate },
      select: { id: true },
    })
    if (!clash) {
      code = candidate
      break
    }
  }
  if (!code) {
    return NextResponse.json(
      { error: "Server Error", message: "Gagal generate kode unik" },
      { status: 500 },
    )
  }

  const password = usernameEqualsPassword
    ? code
    : passwordPrefix + generateRandomPassword(8)

  // ── Persist: create voucher + (reseller) deduct wallet + log, in one tx ────
  const { voucher, remainingBalance } = await db.$transaction(async (tx) => {
    const created = await tx.voucher.create({
      data: {
        code,
        password,
        user_id: user.id,
        profile_id: profileId,
        status: "unused",
        price_charged: priceCharged,
        source: user.role === "TENANT_ADMIN" ? "admin" : "reseller",
        tenant_id: tenantId,
      },
      select: { id: true, code: true },
    })

    let remaining = 0
    if (user.role === "RESELLER" && priceCharged > 0) {
      const wallet = await tx.wallet.findUnique({ where: { user_id: user.id } })
      if (!wallet) throw new Error("Wallet tidak ditemukan")

      const balanceBefore = Number(wallet.balance)
      const balanceAfter = balanceBefore - priceCharged

      await tx.wallet.update({
        where: { user_id: user.id },
        data: {
          balance: balanceAfter,
          total_spent: { increment: priceCharged },
        },
      })

      await tx.walletLog.create({
        data: {
          wallet_id: wallet.id,
          type: "generate",
          amount: priceCharged,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: `Generate 1x ${profile.name}`,
          reference_id: created.id,
          tenant_id: tenantId,
        },
      })

      remaining = balanceAfter
    } else {
      // TENANT_ADMIN: gratis — saldo tidak berubah, kembalikan saldo saat ini.
      const wallet = await tx.wallet.findUnique({ where: { user_id: user.id } })
      remaining = Number(wallet?.balance ?? 0)
    }

    return { voucher: created, remainingBalance: remaining }
  })

  // ── Sync to MikroTik (best-effort — jangan gagalkan response) ──────────────
  let mikrotikSynced = false
  try {
    await createHotspotUser(tenantId, voucher.code, password, profile.mikrotik_profile)
    mikrotikSynced = true
    await db.voucher.updateMany({
      where: { id: voucher.id },
      data: { mikrotik_synced: true },
    })
  } catch (err) {
    console.error(`MIKROTIK ERROR [bot voucher ${voucher.code}]:`, err)
  }

  return NextResponse.json(
    {
      code: voucher.code,
      password,
      profileName: profile.name,
      priceCharged,
      remainingBalance,
      remainingBalanceFormatted: formatRupiah(remainingBalance),
      mikrotikSynced,
    },
    { status: 201 },
  )
}
