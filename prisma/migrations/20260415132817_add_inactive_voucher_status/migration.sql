/*
  Warnings:

  - You are about to drop the column `description` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "VoucherStatus" ADD VALUE 'inactive';

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "description";
