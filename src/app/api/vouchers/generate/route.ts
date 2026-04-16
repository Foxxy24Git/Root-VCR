import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { generateVoucherSchema } from "@/lib/validations/voucher"
import { generateVoucherCode, calculateResellerPrice } from "@/lib/utils"
import { createHotspotUser } from "@/services/mikrotik.service"

// POST /api/vouchers/generate
// Admin: gratis (tidak potong wallet)
// Reseller: potong wallet sesuai harga reseller
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Bad Request", message: "Body tidak valid" }, { status: 400 })
  }

  const parsed = generateVoucherSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation Error", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { profileId, quantity } = parsed.data

  // Ambil profile
  const profile = await prisma.profile.findUnique({ where: { id: profileId, is_active: true } })
  if (!profile) {
    return NextResponse.json({ error: "Not Found", message: "Profile tidak ditemukan" }, { status: 404 })
  }

  const basePrice = Number(profile.price)

  // Reseller: cek akses ke profile + saldo wallet
  if (user.role === "reseller") {
    const access = await prisma.resellerProfile.findUnique({
      where: { user_id_profile_id: { user_id: user.id, profile_id: profileId } },
    })
    if (!access || !access.is_enabled) {
      return NextResponse.json(
        { error: "Forbidden", message: "Anda tidak memiliki akses ke profile ini" },
        { status: 403 }
      )
    }

    // Cek akun reseller tidak dibekukan
    const resellerData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { is_frozen: true, fee_percentage: true },
    })
    if (resellerData?.is_frozen) {
      return NextResponse.json(
        { error: "Forbidden", message: "Akun Anda dibekukan" },
        { status: 403 }
      )
    }

    const feePercentage = Number(resellerData?.fee_percentage ?? 0)
    const { resellerPrice } = calculateResellerPrice(basePrice, feePercentage)
    const totalCost = resellerPrice * quantity

    const wallet = await prisma.wallet.findUnique({ where: { user_id: user.id } })
    if (!wallet || Number(wallet.balance) < totalCost) {
      return NextResponse.json(
        {
          error: "Insufficient Balance",
          message: `Saldo tidak cukup. Dibutuhkan Rp ${totalCost.toLocaleString("id-ID")}, saldo: Rp ${Number(wallet?.balance ?? 0).toLocaleString("id-ID")}`,
        },
        { status: 402 }
      )
    }
  }

  // Ambil settings untuk kode format
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["voucher_prefix", "voucher_code_length", "voucher_code_format", "voucher_username_equals_password"] } },
  })
  const getSetting = (key: string, def: string) =>
    settings.find((s) => s.key === key)?.value ?? def

  const prefix   = getSetting("voucher_prefix", "")
  const codeLen  = parseInt(getSetting("voucher_code_length", "8"))
  const format   = getSetting("voucher_code_format", "alphanumeric_upper") as
    "alphanumeric_upper" | "alphanumeric_lower" | "alphanumeric_mixed" | "numeric" | "alpha"

  // Generate kode unik (retry jika collision)
  const codes: string[] = []
  const existingCodes = new Set(
    (await prisma.voucher.findMany({ select: { code: true } })).map((v) => v.code)
  )
  let attempts = 0
  while (codes.length < quantity && attempts < quantity * 10) {
    const code = generateVoucherCode(prefix, codeLen, format)
    if (!existingCodes.has(code) && !codes.includes(code)) {
      codes.push(code)
    }
    attempts++
  }

  if (codes.length < quantity) {
    return NextResponse.json(
      { error: "Server Error", message: "Gagal generate kode unik" },
      { status: 500 }
    )
  }

  // Hitung harga per voucher
  // Admin: gratis (price_charged = 0, tidak potong wallet)
  let priceCharged = user.role === "admin" ? 0 : basePrice
  let feePercentage = 0
  if (user.role === "reseller") {
    const resellerData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { fee_percentage: true },
    })
    feePercentage = Number(resellerData?.fee_percentage ?? 0)
    priceCharged = calculateResellerPrice(basePrice, feePercentage).resellerPrice
  }

  const totalCost = priceCharged * quantity

  // Jalankan dalam satu transaksi DB
  const vouchers = await prisma.$transaction(async (tx) => {
    // Buat semua voucher
    const created = await Promise.all(
      codes.map((code) =>
        tx.voucher.create({
          data: {
            code,
            user_id: user.id,
            profile_id: profileId,
            status: "unused",
            price_charged: priceCharged,
            source: user.role === "admin" ? "admin" : "reseller",
          },
          select: {
            id: true, code: true, status: true, price_charged: true,
            generated_at: true, mikrotik_synced: true,
            profile: { select: { name: true, duration_days: true } },
          },
        })
      )
    )

    // Potong wallet reseller
    if (user.role === "reseller" && totalCost > 0) {
      const wallet = await tx.wallet.findUnique({ where: { user_id: user.id } })
      if (!wallet) throw new Error("Wallet tidak ditemukan")

      const balanceBefore = Number(wallet.balance)
      const balanceAfter  = balanceBefore - totalCost

      await tx.wallet.update({
        where: { user_id: user.id },
        data: {
          balance:     balanceAfter,
          total_spent: { increment: totalCost },
        },
      })

      await tx.walletLog.create({
        data: {
          wallet_id:      wallet.id,
          type:           "generate",
          amount:         totalCost,
          balance_before: balanceBefore,
          balance_after:  balanceAfter,
          description:    `Generate ${quantity}x ${profile.name}`,
          reference_id:   created[0].id,
        },
      })
    }

    return created
  })

  // Validate mikrotik_profile is set before syncing
  if (!profile.mikrotik_profile) {
    console.error("MIKROTIK ERROR: mikrotik_profile kosong untuk profile", profile.name)
  }

  // Sync ke MikroTik (best-effort — tidak gagalkan request jika MikroTik unreachable)
  const syncResults = await Promise.allSettled(
    vouchers.map((v) =>
      createHotspotUser(v.code, v.code, profile.mikrotik_profile)
    )
  )

  // Update mikrotik_synced=true untuk voucher yang berhasil disync
  const syncedIds: string[] = []
  syncResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      syncedIds.push(vouchers[i].id)
    } else {
      console.error(`MIKROTIK ERROR [voucher ${vouchers[i].code}]:`, result.reason)
    }
  })

  if (syncedIds.length > 0) {
    await prisma.voucher.updateMany({
      where: { id: { in: syncedIds } },
      data: { mikrotik_synced: true },
    })
    // Patch local voucher objects so response reflects actual state
    syncedIds.forEach((id) => {
      const v = vouchers.find((x) => x.id === id)
      if (v) (v as typeof v & { mikrotik_synced: boolean }).mikrotik_synced = true
    })
  }

  const syncFailed = syncResults.filter((r) => r.status === "rejected").length

  return NextResponse.json(
    {
      vouchers,
      summary: {
        quantity,
        profile_name: profile.name,
        price_per_voucher: priceCharged,
        total_cost: user.role === "reseller" ? totalCost : 0,
        fee_percentage: feePercentage,
        mikrotik_synced: syncedIds.length,
        mikrotik_failed: syncFailed,
      },
    },
    { status: 201 }
  )
}
