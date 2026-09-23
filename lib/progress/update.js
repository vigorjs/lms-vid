import { randomUUID } from "node:crypto";

export async function saveWatchProgress(db, { courseId, studentId, positionSeconds, durationSeconds }) {
  const position = Math.min(durationSeconds, positionSeconds);
  const percent = position / durationSeconds * 100;
  const [row] = await db.$queryRaw`
    INSERT INTO "WatchProgress" ("id", "courseId", "studentId", "maxPositionSeconds", "percent", "updatedAt")
    VALUES (${randomUUID()}, ${courseId}, ${studentId}, ${position}, ${percent}, NOW())
    ON CONFLICT ("courseId", "studentId") DO UPDATE SET
      "maxPositionSeconds" = GREATEST("WatchProgress"."maxPositionSeconds", EXCLUDED."maxPositionSeconds"),
      "percent" = GREATEST("WatchProgress"."percent", EXCLUDED."percent"),
      "updatedAt" = NOW()
    RETURNING "percent"
  `;
  return row.percent;
}
