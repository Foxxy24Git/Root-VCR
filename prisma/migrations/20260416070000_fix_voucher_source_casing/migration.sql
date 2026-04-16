-- Rename enum values from UPPERCASE to lowercase to match schema convention
ALTER TYPE "VoucherSource" RENAME VALUE 'ADMIN' TO 'admin';
ALTER TYPE "VoucherSource" RENAME VALUE 'RESELLER' TO 'reseller';

-- Update column default to lowercase
ALTER TABLE "vouchers" ALTER COLUMN "source" SET DEFAULT 'reseller';
