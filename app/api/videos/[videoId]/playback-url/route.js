import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { createPlaybackUrl } from "@/lib/storage/minio";
import { AppError, errorResponse } from "@/lib/errors";

export async function GET(_request, { params }) {
  try {
    const user = await authorize(); const { videoId } = await params;
    const asset = await db.videoAsset.findUnique({ where: { id: videoId }, include: { course: true } }); if (!asset || asset.status !== "READY") throw new AppError("Video belum tersedia.", 404, "NOT_FOUND");
    let allowed = asset.ownerId === user.id || user.role === "ADMIN";
    if (!allowed && asset.kind === "REFERENCE") allowed = asset.course?.status === "PUBLISHED" || canManageCourse(user, asset.course);
    if (!allowed && user.role === "TEACHER") allowed = Boolean(await db.submission.findFirst({ where: { course: { teacherId: user.id }, status: { in: ["SUBMITTED", "REVIEWED"] }, OR: [{ originalVideoId: videoId }, { activeVideoId: videoId }, { referenceVideoId: videoId }] }, select: { id: true } }));
    if (!allowed) throw new AppError("Tidak boleh memutar video ini.", 403, "FORBIDDEN");
    return Response.json({ data: { url: await createPlaybackUrl(asset.objectKey), expiresIn: 3600 } });
  } catch (error) { return errorResponse(error); }
}
