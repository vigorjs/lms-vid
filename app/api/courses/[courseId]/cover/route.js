import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { AppError, errorResponse } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/image/server";
import { createPlaybackUrl, removeStorageObject } from "@/lib/storage/minio";
import { courseAccessWhere } from "@/lib/courses/access";

function revalidateCourse(courseId) {
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/admin/courses");
  revalidatePath("/teacher/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/teacher/courses/${courseId}/edit`);
}

export async function GET(_request, { params }) {
  try {
    const user = await authorize();
    const { courseId } = await params;
    const course = await db.course.findFirst({ where: { id: courseId, ...courseAccessWhere(user) } });
    if (!course) throw new AppError("Cover tidak ditemukan.", 404, "NOT_FOUND");
    if (!course.coverImageKey) throw new AppError("Cover belum tersedia.", 404, "NOT_FOUND");

    const location = await createPlaybackUrl(course.coverImageKey);
    return new Response(null, {
      status: 307,
      headers: {
        Location: location,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await authorize(["ADMIN", "TEACHER"]);
    const { courseId } = await params;
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError("Course tidak ditemukan.", 404, "NOT_FOUND");
    if (!canManageCourse(user, course)) throw new AppError("Tidak boleh mengubah cover course ini.", 403, "FORBIDDEN");
    if (!course.coverImageKey) throw new AppError("Cover belum tersedia.", 404, "NOT_FOUND");

    const objectKey = course.coverImageKey;
    await db.course.update({ where: { id: course.id }, data: { coverImageKey: null, coverUpdatedAt: null } });
    await removeStorageObject(objectKey).catch((error) => console.error("Gagal menghapus cover dari storage", error));
    revalidateCourse(course.id);
    return Response.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
