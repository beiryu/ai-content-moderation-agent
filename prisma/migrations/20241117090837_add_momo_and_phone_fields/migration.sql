/*
  Warnings:

  - A unique constraint covering the columns `[momo_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[momo_subscription_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `accounts_userId_fkey` ON `accounts`;

-- DropIndex
DROP INDEX `posts_authorId_fkey` ON `posts`;

-- DropIndex
DROP INDEX `sessions_userId_fkey` ON `sessions`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `momo_current_period_end` DATETIME(3) NULL,
    ADD COLUMN `momo_customer_id` VARCHAR(191) NULL,
    ADD COLUMN `momo_price_id` VARCHAR(191) NULL,
    ADD COLUMN `momo_subscription_id` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_momo_customer_id_key` ON `users`(`momo_customer_id`);

-- CreateIndex
CREATE UNIQUE INDEX `users_momo_subscription_id_key` ON `users`(`momo_subscription_id`);

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
