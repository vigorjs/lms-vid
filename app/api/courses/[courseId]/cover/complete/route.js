import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { AppError, errorResponse } from "@/lib/errors";
import { coverCompleteSchema } from "@/lib/validation";
import { MAX_COVER_OUTPUT_BYTES } from "@/lib/image/constants";
import { assertCoverObjectKey, assertSameOrigin } from "@/lib/image/server";
import { hasWebpSignature } from "@/lib/image/validation";
import { readStorageObjectRange, removeStorageObject } from "@/lib/storage/minio";

function revalidateCourse(courseId) {
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/teacher/courses/${courseId}/edit`);
}

async function contextFor(request, params) {
  assertSameOrigin(request);
  const user = await authorize(["ADMIN", "TEACHER"]);
  const { courseId } = await params;
  const input = coverCompleteSchema.parse(await request.json());
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError("Course tidak ditemukan.", 404, "NOT_FOUND");
  if (!canManageCourse(user, course)) throw new AppError("Tidak boleh mengubah cover course ini.", 403, "FORBIDDEN");
  assertCoverObjectKey(input.objectKey, course.id, user.id);
  return { course, input };
}

export async function POST(request, { params }) {
  try {
    const { course, input } = await contextFor(request, params);
    let object;
    try {
      object = await readStorageObjectRange(input.objectKey, 12);
    } catch (error) {
      console.error("Gagal memverifikasi cover di storage", error);
      throw new AppError("Storage cover tidak dapat diverifikasi.", 502, "STORAGE_UNAVAILABLE");
    }
    if (!object) throw new AppError("File cover tidak ditemukan di storage.", 404, "OBJECT_NOT_FOUND");
    if (Number(object.size) <= 0 || Number(object.size) > MAX_COVER_OUTPUT_BYTES) throw new AppError("Ukuran cover tidak valid.", 400, "INVALID_COVER_SIZE");
    if (!hasWebpSignature(object.buffer)) throw new AppError("File cover bukan WebP yang valid.", 400, "INVALID_COVER_FILE");

    await db.course.update({ where: { id: course.id }, data: { coverImageKey: input.objectKey, coverUpdatedAt: new Date() } });
    if (course.coverImageKey && course.coverImageKey !== input.objectKey) {
      await removeStorageObject(course.coverImageKey).catch((error) => console.error("Gagal membersihkan cover lama", error));
    }
    revalidateCourse(course.id);
    return Response.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { course, input } = await contextFor(request, params);
    if (course.coverImageKey === input.objectKey) throw new AppError("Cover aktif tidak dapat dibersihkan sebagai upload gagal.", 409, "COVER_IS_ACTIVE");
    await removeStorageObject(input.objectKey);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
