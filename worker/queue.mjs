export async function claimJob(db) {
  const rows = await db.$queryRaw`
    UPDATE "VideoProcessingJob" AS job
    SET "status" = 'RUNNING'::"ProcessingJobStatus",
        "attempts" = job."attempts" + 1,
        "leaseUntil" = NOW() + INTERVAL '30 minutes',
        "updatedAt" = NOW()
    FROM (
      SELECT "assetId" FROM "VideoProcessingJob"
      WHERE "status" = 'PENDING'::"ProcessingJobStatus"
         OR ("status" = 'RUNNING'::"ProcessingJobStatus" AND "leaseUntil" < NOW())
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1
    ) AS pending
    WHERE job."assetId" = pending."assetId"
    RETURNING job.*
  `;
  return rows[0] || null;
}
