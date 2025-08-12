/*
  Warnings:

  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCurrentPeriodEnd` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionStatus` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripe_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[momo_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[momo_subscription_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_stripeCustomerId_key";

-- DropIndex
DROP INDEX "users_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
DROP COLUMN "stripeCurrentPeriodEnd",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripePriceId",
DROP COLUMN "stripeSubscriptionId",
DROP COLUMN "stripeSubscriptionStatus",
ADD COLUMN     "momo_current_period_end" TIMESTAMP(3),
ADD COLUMN     "momo_customer_id" TEXT,
ADD COLUMN     "momo_price_id" TEXT,
ADD COLUMN     "momo_subscription_id" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "stripe_current_period_end" TIMESTAMP(3),
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_momo_customer_id_key" ON "users"("momo_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_momo_subscription_id_key" ON "users"("momo_subscription_id");
