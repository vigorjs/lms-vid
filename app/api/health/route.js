import { db } from "@/lib/db";
import { storageIsHealthy } from "@/lib/storage/minio";

export async function GET() {
  const checks = await Promise.allSettled([db.$queryRaw`SELECT 1`, storageIsHealthy()]);
  const database = checks[0].status === "fulfilled";
  const storage = checks[1].status === "fulfilled" && checks[1].value === true;
  return Response.json({ status: database && storage ? "ok" : "degraded", checks: { database, storage } }, { status: database && storage ? 200 : 503 });
}
