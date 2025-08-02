/*
  Warnings:

  - You are about to drop the column `messageType` on the `interview_messages` table. All the data in the column will be lost.
  - You are about to drop the column `analysis` on the `interview_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `completion_rate` on the `interview_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `feedback_summary` on the `interview_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `interview_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `interview_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `due_date` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `resumes` table. All the data in the column will be lost.
  - You are about to drop the `answer_analyses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `coaching_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `interview_session_performances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `jobs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `qa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_analyses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_progress` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyName` to the `interviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobTitle` to the `interviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `interviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "answer_analyses" DROP CONSTRAINT "answer_analyses_messageId_fkey";

-- DropForeignKey
ALTER TABLE "coaching_sessions" DROP CONSTRAINT "coaching_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "interview_session_performances" DROP CONSTRAINT "interview_session_performances_interviewSessionId_fkey";

-- DropForeignKey
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_jobId_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "qa" DROP CONSTRAINT "qa_jobId_fkey";

-- DropForeignKey
ALTER TABLE "question_analyses" DROP CONSTRAINT "question_analyses_messageId_fkey";

-- DropForeignKey
ALTER TABLE "user_progress" DROP CONSTRAINT "user_progress_userId_fkey";

-- AlterTable
ALTER TABLE "interview_messages" DROP COLUMN "messageType",
ADD COLUMN     "analysis" JSONB;

-- AlterTable
ALTER TABLE "interview_sessions" DROP COLUMN "analysis",
DROP COLUMN "completion_rate",
DROP COLUMN "feedback_summary",
DROP COLUMN "metadata",
DROP COLUMN "status",
ADD COLUMN     "feedback" TEXT,
ALTER COLUMN "performance_score" DROP NOT NULL,
ALTER COLUMN "duration" DROP NOT NULL;

-- AlterTable
ALTER TABLE "interviews" DROP COLUMN "created_at",
DROP COLUMN "due_date",
DROP COLUMN "jobId",
DROP COLUMN "priority",
DROP COLUMN "status",
ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "jobTitle" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "resumes" DROP COLUMN "status";

-- DropTable
DROP TABLE "answer_analyses";

-- DropTable
DROP TABLE "coaching_sessions";

-- DropTable
DROP TABLE "interview_session_performances";

-- DropTable
DROP TABLE "jobs";

-- DropTable
DROP TABLE "posts";

-- DropTable
DROP TABLE "qa";

-- DropTable
DROP TABLE "question_analyses";

-- DropTable
DROP TABLE "user_progress";

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
