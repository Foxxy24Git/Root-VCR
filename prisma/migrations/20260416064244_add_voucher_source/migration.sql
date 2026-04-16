-- CreateEnum
CREATE TYPE "VoucherSource" AS ENUM ('ADMIN', 'RESELLER');

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "source" "VoucherSource" NOT NULL DEFAULT 'RESELLER';
