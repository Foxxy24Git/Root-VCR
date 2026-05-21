-- Enforces tenant scoping on all tenant-bound tables.
-- User and AuditLog keep tenant_id nullable (super admin / system events).
-- Backfill ran via prisma/seed-multitenant.ts before this migration.

-- DropForeignKey
ALTER TABLE "pppoe_users" DROP CONSTRAINT "pppoe_users_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "reseller_profiles" DROP CONSTRAINT "reseller_profiles_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "settings" DROP CONSTRAINT "settings_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_logs" DROP CONSTRAINT "wallet_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_tenant_id_fkey";

-- DropIndex
DROP INDEX "settings_key_key";

-- AlterTable
ALTER TABLE "pppoe_users" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "reseller_profiles" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "vouchers" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "wallet_logs" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "wallets" ALTER COLUMN "tenant_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "settings_tenant_id_key_key" ON "settings"("tenant_id", "key");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_logs" ADD CONSTRAINT "wallet_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reseller_profiles" ADD CONSTRAINT "reseller_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pppoe_users" ADD CONSTRAINT "pppoe_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
