ALTER TABLE "VideoAsset"
ADD COLUMN "submissionId" TEXT,
ADD COLUMN "versionNumber" INTEGER,
ADD COLUMN "editSpec" JSONB;

WITH RECURSIVE "versionTree" AS (
  SELECT s."id" AS "submissionId", v."id" AS "assetId"
  FROM "Submission" s
  JOIN "VideoAsset" v ON v."id" = s."originalVideoId"

  UNION ALL

  SELECT tree."submissionId", child."id"
  FROM "versionTree" tree
  JOIN "VideoAsset" child ON child."parentAssetId" = tree."assetId"
), "resolvedTree" AS (
  SELECT DISTINCT ON ("assetId") "submissionId", "assetId"
  FROM "versionTree"
  ORDER BY "assetId", "submissionId"
)
UPDATE "VideoAsset" asset
SET "submissionId" = tree."submissionId"
FROM "resolvedTree" tree
WHERE asset."id" = tree."assetId";

WITH "rankedVersions" AS (
  SELECT
    asset."id",
    ROW_NUMBER() OVER (
      PARTITION BY asset."submissionId"
      ORDER BY asset."createdAt", asset."id"
    ) - 1 AS "versionNumber"
  FROM "VideoAsset" asset
  WHERE asset."submissionId" IS NOT NULL
)
UPDATE "VideoAsset" asset
SET "versionNumber" = versions."versionNumber"
FROM "rankedVersions" versions
WHERE asset."id" = versions."id";

CREATE INDEX "VideoAsset_submissionId_status_createdAt_idx"
ON "VideoAsset"("submissionId", "status", "createdAt");

CREATE UNIQUE INDEX "VideoAsset_submissionId_versionNumber_key"
ON "VideoAsset"("submissionId", "versionNumber");

ALTER TABLE "VideoAsset"
ADD CONSTRAINT "VideoAsset_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
