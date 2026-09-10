-- Store the active S3 multipart session so completion and cancellation can be authorized server-side.
ALTER TABLE "VideoAsset"
ADD COLUMN "multipartUploadId" TEXT,
ADD COLUMN "multipartPartSize" INTEGER;

CREATE UNIQUE INDEX "VideoAsset_multipartUploadId_key" ON "VideoAsset"("multipartUploadId");

