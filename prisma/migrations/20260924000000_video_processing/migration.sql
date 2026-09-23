ALTER TYPE "VideoStatus" ADD VALUE 'PROCESSING';

CREATE TYPE "ProcessingJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE');

ALTER TABLE "VideoAsset" ADD COLUMN "processingError" TEXT;

CREATE TABLE "VideoProcessingJob" (
    "assetId" TEXT NOT NULL,
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "sourceKey" TEXT NOT NULL,
    "outputKey" TEXT NOT NULL,
    "lastError" TEXT,
    "sourceDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VideoProcessingJob_pkey" PRIMARY KEY ("assetId")
);

CREATE INDEX "VideoProcessingJob_status_leaseUntil_createdAt_idx" ON "VideoProcessingJob"("status", "leaseUntil", "createdAt");

ALTER TABLE "VideoProcessingJob" ADD CONSTRAINT "VideoProcessingJob_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "VideoAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
