import "server-only";

import { AppError } from "@/lib/errors";
import { createStorageObjectKey } from "@/lib/storage/minio";

export function coverObjectPrefix(courseId, userId) {
  return `${createStorageObjectKey("covers", courseId, userId)}/`;
}

export function assertCoverObjectKey(objectKey, courseId, userId) {
  const prefix = coverObjectPrefix(courseId, userId);
  if (!objectKey.startsWith(prefix) || !objectKey.endsWith(".webp") || objectKey.slice(prefix.length).includes("/")) {
    throw new AppError("Object cover tidak valid.", 400, "INVALID_COVER_KEY");
  }
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL || "http://localhost:3000";
  if (origin && origin !== expected) throw new AppError("Origin request tidak diizinkan.", 403, "INVALID_ORIGIN");
}
