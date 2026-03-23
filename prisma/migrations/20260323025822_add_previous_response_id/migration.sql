/*
  Warnings:

  - You are about to drop the column `session_context` on the `interview_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `transcript_document_id` on the `interview_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN     "previous_response_id" TEXT;

-- AlterTable
ALTER TABLE "interview_sessions" DROP COLUMN "session_context",
DROP COLUMN "transcript_document_id",
ADD COLUMN     "sessionContext" TEXT;
