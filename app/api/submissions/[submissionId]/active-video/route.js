import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { idSchema } from "@/lib/validation";
import { AppError, errorResponse } from "@/lib/errors";

function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL || "http://localhost:3000";
  if (origin && origin !== expected) throw new AppError("Origin request tidak diizinkan.", 403, "INVALID_ORIGIN");
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await authorize(["STUDENT"]);
    const { submissionId } = await params;
    const videoId = idSchema.parse((await request.json()).videoId);
    const submission = await db.submission.findFirst({
      where: { id: submissionId, studentId: user.id, status: "DRAFT" },
      select: { id: true, activeVideoId: true },
    });
    if (!submission) throw new AppError("Draft attempt tidak ditemukan.", 404, "DRAFT_NOT_FOUND");

    const video = await db.videoAsset.findFirst({
      where: { id: videoId, submissionId: submission.id, ownerId: user.id, status: "READY", kind: { in: ["STUDENT_ORIGINAL", "STUDENT_EDIT"] } },
      select: { id: true },
    });
    if (!video) throw new AppError("Versi video tidak ditemukan.", 404, "VERSION_NOT_FOUND");

    if (submission.activeVideoId !== video.id) {
      await db.submission.update({ where: { id: submission.id }, data: { activeVideoId: video.id } });
    }
    return Response.json({ data: { activeVideoId: video.id } });
  } catch (error) {
    return errorResponse(error);
  }
}
