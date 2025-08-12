/*
  Warnings:

  - You are about to drop the column `type` on the `interview_messages` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `jobTitle` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `organization` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profileBackground` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `resumes` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `role` to the `interview_messages` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "resumes" DROP CONSTRAINT "resumes_userId_fkey";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "document_chunks" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "interview_messages" DROP COLUMN "type",
ADD COLUMN     "role" "MessageRole" NOT NULL,
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "interviews" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "authorId",
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "bio",
DROP COLUMN "jobTitle",
DROP COLUMN "location",
DROP COLUMN "organization",
DROP COLUMN "profileBackground",
DROP COLUMN "website",
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "resumes";
