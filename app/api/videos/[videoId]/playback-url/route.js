import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { createPlaybackUrl } from "@/lib/storage/minio";
import { AppError, errorResponse } from "@/lib/errors";
import { canAccessCourse } from "@/lib/courses/access";

export async function GET(_request, { params }) {
  try {
    const user = await authorize(); const { videoId } = await params;
    const asset = await db.videoAsset.findUnique({ where: { id: videoId }, include: { course: { include: { category: true, assignments: { where: { studentId: user.id }, select: { studentId: true } } } } } }); if (!asset || asset.status !== "READY") throw new AppError("Video belum tersedia.", 404, "NOT_FOUND");
    const courseAllowed = canAccessCourse(user, asset.course);
    let allowed = user.role === "ADMIN";
    if (!allowed && asset.ownerId === user.id) allowed = user.role !== "STUDENT" || courseAllowed;
    if (!allowed && asset.kind === "REFERENCE") allowed = courseAllowed || Boolean(asset.course && canManageCourse(user, asset.course));
    if (!allowed && user.role === "TEACHER") allowed = Boolean(await db.submission.findFirst({ where: { course: { teacherId: user.id }, status: { in: ["SUBMITTED", "REVIEWED"] }, OR: [{ originalVideoId: videoId }, { activeVideoId: videoId }, { referenceVideoId: videoId }] }, select: { id: true } }));
    if (!allowed) throw new AppError("Tidak boleh memutar video ini.", 403, "FORBIDDEN");
    return Response.json({ data: { url: await createPlaybackUrl(asset.objectKey), expiresIn: 3600 } });
  } catch (error) { return errorResponse(error); }
}
