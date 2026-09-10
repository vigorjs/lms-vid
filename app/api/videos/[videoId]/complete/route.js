import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { statVideo } from "@/lib/storage/minio";
import { AppError, errorResponse } from "@/lib/errors";

export async function POST(request, { params }) {
  try {
    const user = await authorize(); const { videoId } = await params; const body = await request.json().catch(() => ({}));
    const asset = await db.videoAsset.findUnique({ where: { id: videoId }, include: { course: true } });
    if (!asset || asset.ownerId !== user.id || asset.status !== "UPLOADING") throw new AppError("Upload tidak ditemukan.", 404, "NOT_FOUND");
    if (asset.kind === "REFERENCE" && !canManageCourse(user, asset.course)) throw new AppError("Tidak diizinkan.", 403, "FORBIDDEN");
    const stat = await statVideo(asset.objectKey); if (Number(stat.size) !== asset.sizeBytes || stat.size > 500 * 1024 * 1024) throw new AppError("Ukuran object tidak sesuai upload intent.", 400, "INVALID_OBJECT");

    const result = await db.$transaction(async (tx) => {
      const ready = await tx.videoAsset.update({ where: { id: asset.id }, data: { status: "READY" } });
      if (asset.kind === "REFERENCE") { await tx.course.update({ where: { id: asset.courseId }, data: { referenceVideoId: asset.id } }); return { asset: ready, submissionId: null }; }
      if (asset.kind === "STUDENT_ORIGINAL") {
        const aggregate = await tx.submission.aggregate({ where: { courseId: asset.courseId, studentId: user.id }, _max: { attemptNumber: true } });
        const course = await tx.course.findUniqueOrThrow({ where: { id: asset.courseId } });
        const submission = await tx.submission.create({ data: { courseId: asset.courseId, studentId: user.id, originalVideoId: asset.id, activeVideoId: asset.id, referenceVideoId: course.referenceVideoId, attemptNumber: (aggregate._max.attemptNumber || 0) + 1 } });
        return { asset: ready, submissionId: submission.id };
      }
      const submission = await tx.submission.findFirst({ where: { id: String(body.submissionId || ""), studentId: user.id, courseId: asset.courseId, status: "DRAFT" } });
      if (!submission) throw new AppError("Draft submission tidak ditemukan.", 404, "DRAFT_NOT_FOUND");
      await tx.submission.update({ where: { id: submission.id }, data: { activeVideoId: asset.id } }); return { asset: ready, submissionId: submission.id };
    });
    return Response.json({ data: { assetId: result.asset.id, submissionId: result.submissionId } });
  } catch (error) { return errorResponse(error); }
}
