import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"
import { needsTrialSuspension } from "@/lib/trial"

/**
 * POST /api/cron/check-trial-expiry
 *
 * Diproteksi oleh `Authorization: Bearer <CRON_SECRET>`.
 *
 * Aksi:
 * 1. Tenant trial dengan `trial_end_at < now` & masih `is_active` → auto-suspend
 *    (set is_active=false, suspended_reason="Trial expired").
 * 2. Tenant trial dengan `trial_end_at < now+3d` → masuk list "expiring soon"
 *    untuk Step 8 (notifikasi).
 *
 * Boleh dipanggil pakai GET juga (memudahkan smoke-test via curl).
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Server Misconfigured", message: "CRON_SECRET belum di-set" },
      { status: 500 }
    )
  }

  const auth = req.headers.get("authorization") ?? ""
  const provided = auth.replace(/^Bearer\s+/i, "")
  if (provided !== secret) {
    return NextResponse.json(
      { error: "Unauthorized", message: "CRON_SECRET tidak cocok" },
      { status: 401 }
    )
  }

  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86_400_000)

  // 1) Tenant trial yang sudah expired & masih aktif → auto-suspend
  const trialCandidates = await prisma.tenant.findMany({
    where: {
      is_trial: true,
      is_active: true,
    },
    select: {
      id: true,
      slug: true,
      trial_end_at: true,
      is_trial: true,
      is_active: true,
    },
  })
  const toSuspend = trialCandidates.filter((t) => needsTrialSuspension(t, now))

  for (const t of toSuspend) {
    await prisma.tenant.update({
      where: { id: t.id },
      data: { is_active: false, suspended_reason: "Trial expired" },
    })
    await writeAuditLog({
      action: "tenant.trial.auto_suspended",
      tenantId: t.id,
      resource: `tenant:${t.id}`,
      metadata: { trial_end_at: t.trial_end_at, suspended_at: now },
    })
  }

  // 2) Tenant trial yang akan expire <= 3 hari (belum expired, masih aktif)
  const expiringSoon = await prisma.tenant.findMany({
    where: {
      is_trial: true,
      is_active: true,
      trial_end_at: { gte: now, lt: threeDaysFromNow },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      owner_email: true,
      owner_phone: true,
      trial_end_at: true,
    },
  })

  for (const t of expiringSoon) {
    await writeAuditLog({
      action: "tenant.trial.expiring_soon",
      tenantId: t.id,
      resource: `tenant:${t.id}`,
      metadata: { trial_end_at: t.trial_end_at, checked_at: now },
    })
  }

  return NextResponse.json({
    ok: true,
    now,
    suspended: toSuspend.map((t) => ({
      id: t.id,
      slug: t.slug,
      trial_end_at: t.trial_end_at,
    })),
    expiring_soon: expiringSoon.map((t) => ({
      id: t.id,
      slug: t.slug,
      trial_end_at: t.trial_end_at,
    })),
    counts: {
      suspended: toSuspend.length,
      expiring_soon: expiringSoon.length,
    },
  })
}

export const POST = handle
export const GET = handle
