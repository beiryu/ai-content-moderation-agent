-- ... warnings remain the same ...

-- DropIndex (PostgreSQL doesn't need explicit index drops before dropping FKs)
DROP INDEX IF EXISTS "accounts_userId_fkey";
DROP INDEX IF EXISTS "posts_authorId_fkey";
DROP INDEX IF EXISTS "sessions_userId_fkey";

-- AlterTable
ALTER TABLE "users" 
ADD COLUMN "momo_current_period_end" TIMESTAMP(3),
ADD COLUMN "momo_customer_id" VARCHAR(191),
ADD COLUMN "momo_price_id" VARCHAR(191),
ADD COLUMN "momo_subscription_id" VARCHAR(191),
ADD COLUMN "phone" VARCHAR(191);

-- CreateIndex
CREATE UNIQUE INDEX "users_momo_customer_id_key" ON "users"("momo_customer_id");
CREATE UNIQUE INDEX "users_momo_subscription_id_key" ON "users"("momo_subscription_id");

-- AddForeignKey
ALTER TABLE "accounts" 
ADD CONSTRAINT "accounts_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions" 
ADD CONSTRAINT "sessions_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "posts" 
ADD CONSTRAINT "posts_authorId_fkey" 
FOREIGN KEY ("authorId") REFERENCES "users"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;