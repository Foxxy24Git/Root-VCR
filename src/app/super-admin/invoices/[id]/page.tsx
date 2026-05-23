import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, FileText, ExternalLink } from "lucide-react"
import { requireSuperAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { InvoiceStatusBadge } from "@/app/super-admin/_components/InvoiceStatusBadge"
import { InvoiceActions } from "./_components/InvoiceActions"

export const metadata = {
  title: "Detail Invoice — Super Admin",
  robots: { index: false, follow: false },
}

const idr = (v: string | number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v))

const dateFmt = (d: Date | null | undefined) =>
  d
    ? d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "—"

const dateTimeFmt = (d: Date | null | undefined) =>
  d ? d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { user, error } = await requireSuperAdmin()
  if (error || !user) redirect("/super-admin/login")

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: params.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          owner_name: true,
          owner_email: true,
        },
      },
    },
  })

  if (!invoice) notFound()

  const isImage =
    invoice.payment_proof !== null &&
    /\.(jpg|jpeg|png)$/i.test(invoice.payment_proof)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/super-admin/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke daftar invoice
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {invoice.invoice_number}
              </p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {idr(invoice.amount.toString())}
              </h1>
              <div className="mt-1.5">
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
          </div>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            proofUrl={invoice.payment_proof}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invoice info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Detail Invoice</h3>
          <KvRow
            label="Periode"
            value={`${dateFmt(invoice.period_start)} – ${dateFmt(invoice.period_end)}`}
          />
          <KvRow label="Dibuat" value={dateTimeFmt(invoice.created_at)} />
          {invoice.notes && <KvRow label="Catatan" value={invoice.notes} />}
          {invoice.rejected_reason && (
            <KvRow label="Alasan Ditolak" value={invoice.rejected_reason} tone="err" />
          )}
        </div>

        {/* Tenant info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Tenant</h3>
          <KvRow label="Nama" value={invoice.tenant.name} />
          <KvRow label="Slug" value={invoice.tenant.slug} mono />
          <KvRow label="PIC" value={invoice.tenant.owner_name} />
          <KvRow label="Email" value={invoice.tenant.owner_email} />
          <div className="pt-1">
            <Link
              href={`/super-admin/tenants/${invoice.tenant.id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Lihat Detail Tenant
            </Link>
          </div>
        </div>
      </div>

      {/* Payment info (only if paid) */}
      {(invoice.paid_at || invoice.verified_by || invoice.payment_method) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Info Pembayaran</h3>
          {invoice.payment_method && (
            <KvRow label="Metode" value={invoice.payment_method} />
          )}
          {invoice.paid_at && (
            <KvRow label="Tanggal Bayar" value={dateTimeFmt(invoice.paid_at)} />
          )}
          {invoice.payment_notes && (
            <KvRow label="Catatan Customer" value={invoice.payment_notes} />
          )}
          {invoice.verified_at && (
            <KvRow label="Diverifikasi Pada" value={dateTimeFmt(invoice.verified_at)} />
          )}
        </div>
      )}

      {/* Payment proof */}
      {invoice.payment_proof && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Bukti Transfer</h3>
            <a
              href={invoice.payment_proof}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Buka di tab baru
            </a>
          </div>
          {isImage ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invoice.payment_proof}
                alt="Bukti Transfer"
                className="w-full h-auto object-contain max-h-[600px]"
              />
            </div>
          ) : (
            <a
              href={invoice.payment_proof}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              Lihat Dokumen PDF
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function KvRow({
  label,
  value,
  mono,
  tone,
}: {
  label: string
  value: string
  mono?: boolean
  tone?: "err"
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-sm " +
          (tone === "err"
            ? "text-red-600 dark:text-red-400"
            : "text-slate-900 dark:text-slate-100") +
          (mono ? " font-mono" : "")
        }
      >
        {value}
      </p>
    </div>
  )
}
