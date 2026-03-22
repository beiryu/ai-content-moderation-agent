-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "momo_current_period_end",
DROP COLUMN IF EXISTS "momo_customer_id",
DROP COLUMN IF EXISTS "momo_price_id",
DROP COLUMN IF EXISTS "momo_subscription_id";
