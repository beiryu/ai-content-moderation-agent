/*
  Warnings:

  - You are about to drop the column `conversation` on the `interview_sessions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "interview_sessions" DROP CONSTRAINT "interview_sessions_interviewId_fkey";

-- AlterTable
ALTER TABLE "interview_sessions" DROP COLUMN "conversation",
ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "interview_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_analyses" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "topics" TEXT[],
    "suggestedAnswerPoints" TEXT[],
    "keywords" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_analyses" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "completenessScore" DOUBLE PRECISION NOT NULL,
    "clarityScore" DOUBLE PRECISION NOT NULL,
    "technicalAccuracy" DOUBLE PRECISION,
    "coveredPoints" TEXT[],
    "missedPoints" TEXT[],
    "improvements" TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answer_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_analyses_messageId_key" ON "question_analyses"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "answer_analyses_messageId_key" ON "answer_analyses"("messageId");

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_messages" ADD CONSTRAINT "interview_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_analyses" ADD CONSTRAINT "question_analyses_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "interview_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_analyses" ADD CONSTRAINT "answer_analyses_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "interview_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
