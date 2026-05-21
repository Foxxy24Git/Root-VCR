-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'AWAITING_VERIFICATION', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterEnum
-- Maps legacy lowercase Role values to new uppercase enum:
--   'admin'    -> 'TENANT_ADMIN'  (existing admins become tenant admins of the default tenant)
--   'reseller' -> 'RESELLER'
-- Super admin user is created afterward by the seed script.
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'RESELLER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'admin'    THEN 'TENANT_ADMIN'::"Role_new"
    WHEN 'reseller' THEN 'RESELLER'::"Role_new"
    ELSE 'TENANT_ADMIN'::"Role_new"
  END
);
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- AlterTable
ALTER TABLE "pppoe_users" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "reseller_profiles" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "wallet_logs" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "tenant_id" TEXT;

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "owner_name" VARCHAR(150) NOT NULL,
    "owner_email" VARCHAR(255) NOT NULL,
    "owner_phone" VARCHAR(30) NOT NULL,
    "mikrotik_host" VARCHAR(255) NOT NULL,
    "mikrotik_port" INTEGER NOT NULL DEFAULT 8728,
    "mikrotik_username" VARCHAR(100) NOT NULL,
    "mikrotik_password_enc" TEXT NOT NULL,
    "mikrotik_use_ssl" BOOLEAN NOT NULL DEFAULT false,
    "mikrotik_last_test_at" TIMESTAMP(3),
    "mikrotik_last_test_ok" BOOLEAN,
    "mikrotik_last_edited_by" TEXT,
    "mikrotik_last_edited_at" TIMESTAMP(3),
    "plan_id" TEXT,
    "is_trial" BOOLEAN NOT NULL DEFAULT true,
    "trial_end_at" TIMESTAMP(3),
    "subscription_start_at" TIMESTAMP(3),
    "subscription_end_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "suspended_reason" TEXT,
    "max_resellers" INTEGER NOT NULL DEFAULT 5,
    "max_vouchers_per_month" INTEGER NOT NULL DEFAULT 1000,
    "logo_url" VARCHAR(500),
    "brand_color" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "max_resellers" INTEGER NOT NULL,
    "max_vouchers_per_month" INTEGER NOT NULL,
    "features" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "payment_method" VARCHAR(100),
    "payment_proof" VARCHAR(500),
    "payment_notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "account_holder" VARCHAR(150) NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(255),
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_is_active_idx" ON "tenants"("is_active");

-- CreateIndex
CREATE INDEX "tenants_is_trial_idx" ON "tenants"("is_trial");

-- CreateIndex
CREATE INDEX "tenants_trial_end_at_idx" ON "tenants"("trial_end_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_invoice_number_key" ON "subscription_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "subscription_invoices_tenant_id_idx" ON "subscription_invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_status_idx" ON "subscription_invoices"("status");

-- CreateIndex
CREATE INDEX "bank_accounts_is_active_idx" ON "bank_accounts"("is_active");

-- CreateIndex
CREATE INDEX "bank_accounts_display_order_idx" ON "bank_accounts"("display_order");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "pppoe_users_tenant_id_idx" ON "pppoe_users"("tenant_id");

-- CreateIndex
CREATE INDEX "profiles_tenant_id_idx" ON "profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "reseller_profiles_tenant_id_idx" ON "reseller_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "settings_tenant_id_idx" ON "settings"("tenant_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "vouchers_tenant_id_idx" ON "vouchers"("tenant_id");

-- CreateIndex
CREATE INDEX "wallet_logs_tenant_id_idx" ON "wallet_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "wallets_tenant_id_idx" ON "wallets"("tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_logs" ADD CONSTRAINT "wallet_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reseller_profiles" ADD CONSTRAINT "reseller_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pppoe_users" ADD CONSTRAINT "pppoe_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
