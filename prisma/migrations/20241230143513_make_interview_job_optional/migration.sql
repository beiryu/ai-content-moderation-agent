-- DropForeignKey
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_jobId_fkey";

-- AlterTable
ALTER TABLE "interviews" ALTER COLUMN "jobId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
