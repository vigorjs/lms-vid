import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { AppError, errorResponse } from "@/lib/errors";
import { coverUploadIntentSchema } from "@/lib/validation";
import { COVER_UPLOAD_URL_EXPIRY_SECONDS } from "@/lib/image/constants";
import { assertSameOrigin, coverObjectPrefix } from "@/lib/image/server";
import { createUploadUrl } from "@/lib/storage/minio";

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await authorize(["ADMIN", "TEACHER"]);
    const { courseId } = await params;
    const input = coverUploadIntentSchema.parse(await request.json());
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError("Course tidak ditemukan.", 404, "NOT_FOUND");
    if (!canManageCourse(user, course)) throw new AppError("Tidak boleh mengubah cover course ini.", 403, "FORBIDDEN");

    const objectKey = `${coverObjectPrefix(course.id, user.id)}${randomUUID()}.webp`;
    const uploadUrl = await createUploadUrl(objectKey, COVER_UPLOAD_URL_EXPIRY_SECONDS);
    return Response.json({ data: { objectKey, uploadUrl } });
  } catch (error) {
    return errorResponse(error);
  }
}
