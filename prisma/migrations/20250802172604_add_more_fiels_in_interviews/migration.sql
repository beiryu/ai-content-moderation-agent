/*
  Warnings:

  - Added the required column `status` to the `interviews` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "status" TEXT NOT NULL;
