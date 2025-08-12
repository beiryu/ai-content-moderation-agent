/*
  Warnings:

  - You are about to drop the column `created_at` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `analysis` on the `interview_messages` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `interview_messages` table. All the data in the column will be lost.
  - You are about to drop the column `performance_score` on the `interview_sessions` table. All the data in the column will be lost.
  - The `feedback` column on the `interview_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `long_term_memories` table. All the data in the column will be lost.
  - You are about to drop the column `avg_score` on the `retrieval_logs` table. All the data in the column will be lost.
  - You are about to drop the column `result_count` on the `retrieval_logs` table. All the data in the column will be lost.
  - You are about to drop the column `session_id` on the `retrieval_logs` table. All the data in the column will be lost.
  - You are about to drop the column `top_score` on the `retrieval_logs` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `retrieval_logs` table. All the data in the column will be lost.
  - You are about to drop the column `session_id` on the `session_memories` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `session_memories` table. All the data in the column will be lost.
  - You are about to drop the column `momo_current_period_end` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `momo_customer_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `momo_price_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `momo_subscription_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_current_period_end` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_customer_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_price_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `interview_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `interview_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `long_term_memories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `avgScore` to the `retrieval_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resultCount` to the `retrieval_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topScore` to the `retrieval_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `retrieval_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `session_memories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `session_memories` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RESUME', 'COVER_LETTER', 'PORTFOLIO', 'JOB_DESCRIPTION', 'NOTES', 'PROJECT_DOCUMENTATION', 'TRANSCRIPT');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('SHORT_TERM', 'LONG_TERM', 'PATTERN', 'INSIGHT');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system');

-- DropForeignKey
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_userId_fkey";

-- DropForeignKey
ALTER TABLE "long_term_memories" DROP CONSTRAINT "long_term_memories_user_id_fkey";

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "retrieval_logs" DROP CONSTRAINT "retrieval_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "session_memories" DROP CONSTRAINT "session_memories_user_id_fkey";

-- DropIndex
DROP INDEX "long_term_memories_user_category_idx";

-- DropIndex
DROP INDEX "retrieval_logs_user_idx";

-- DropIndex
DROP INDEX "session_memories_user_session_idx";

-- DropIndex
DROP INDEX "users_momo_customer_id_key";

-- DropIndex
DROP INDEX "users_momo_subscription_id_key";

-- DropIndex
DROP INDEX "users_stripe_customer_id_key";

-- DropIndex
DROP INDEX "users_stripe_subscription_id_key";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "created_at",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "interview_messages" DROP COLUMN "analysis",
DROP COLUMN "role",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "interview_sessions" DROP COLUMN "performance_score",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'in_progress',
ADD COLUMN     "title" TEXT,
ADD COLUMN     "transcripts" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
DROP COLUMN "feedback",
ADD COLUMN     "feedback" JSONB;

-- AlterTable
ALTER TABLE "interviews" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "long_term_memories" DROP COLUMN "user_id",
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "metadata" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retrieval_logs" DROP COLUMN "avg_score",
DROP COLUMN "result_count",
DROP COLUMN "session_id",
DROP COLUMN "top_score",
DROP COLUMN "user_id",
ADD COLUMN     "avgScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "resultCount" INTEGER NOT NULL,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "topScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "session_memories" DROP COLUMN "session_id",
DROP COLUMN "user_id",
ADD COLUMN     "sessionId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "metadata" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "momo_current_period_end",
DROP COLUMN "momo_customer_id",
DROP COLUMN "momo_price_id",
DROP COLUMN "momo_subscription_id",
DROP COLUMN "phone",
DROP COLUMN "stripe_current_period_end",
DROP COLUMN "stripe_customer_id",
DROP COLUMN "stripe_price_id",
DROP COLUMN "stripe_subscription_id",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "profileBackground" TEXT,
ADD COLUMN     "role" TEXT DEFAULT 'user',
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripeSubscriptionStatus" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "fileUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_entries" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "metadata" JSONB,
    "embedding" TEXT,
    "relevanceScore" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "memoryType" "MemoryType" NOT NULL,
    "content" TEXT NOT NULL,
    "context" JSONB,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "last_accessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_query_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "query" TEXT NOT NULL,
    "results" JSONB,
    "responseTime" INTEGER,
    "relevanceScore" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentIds" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "long_term_memories_userId_category_idx" ON "long_term_memories"("userId", "category");

-- CreateIndex
CREATE INDEX "retrieval_logs_userId_idx" ON "retrieval_logs"("userId");

-- CreateIndex
CREATE INDEX "session_memories_userId_sessionId_idx" ON "session_memories"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_memories" ADD CONSTRAINT "interview_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_memories" ADD CONSTRAINT "interview_memories_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_query_logs" ADD CONSTRAINT "rag_query_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_query_logs" ADD CONSTRAINT "rag_query_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_memories" ADD CONSTRAINT "session_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "long_term_memories" ADD CONSTRAINT "long_term_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_logs" ADD CONSTRAINT "retrieval_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
