import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { uploadIntentSchema } from "@/lib/validation";
import { createPresignedUpload, createVideoObjectKey } from "@/lib/storage/minio";
import { AppError, errorResponse } from "@/lib/errors";

function assertSameOrigin(request) {
  const origin = request.headers.get("origin"); const expected = process.env.APP_URL || "http://localhost:3000";
  if (origin && origin !== expected) throw new AppError("Origin request tidak diizinkan.", 403, "INVALID_ORIGIN");
}

export async function POST(request) {
  try {
    assertSameOrigin(request); const user = await authorize(); const input = uploadIntentSchema.parse(await request.json());
    const course = await db.course.findUnique({ where: { id: input.courseId }, include: { referenceVideo: true } }); if (!course) throw new AppError("Course tidak ditemukan.", 404, "NOT_FOUND");
    let kind; let parent = null;
    if (input.purpose === "REFERENCE") {
      if (!canManageCourse(user, course)) throw new AppError("Tidak boleh mengubah video course ini.", 403, "FORBIDDEN"); kind = "REFERENCE";
    } else {
      if (user.role !== "STUDENT" || course.status !== "PUBLISHED" || !course.referenceVideoId) throw new AppError("Course belum dapat digunakan untuk latihan.", 403, "FORBIDDEN");
      if (input.purpose === "STUDENT_ORIGINAL") {
        const draft = await db.submission.findFirst({ where: { courseId: course.id, studentId: user.id, status: "DRAFT" } }); if (draft) throw new AppError("Selesaikan draft aktif sebelum membuat attempt baru.", 409, "DRAFT_EXISTS"); kind = "STUDENT_ORIGINAL";
      } else {
        parent = await db.videoAsset.findFirst({ where: { id: input.parentAssetId, ownerId: user.id, courseId: course.id, status: "READY" } });
        const submission = await db.submission.findFirst({ where: { id: input.submissionId, studentId: user.id, courseId: course.id, status: "DRAFT" } });
        if (!parent || !submission || input.trimStartSeconds >= input.trimEndSeconds || input.trimEndSeconds > input.durationSeconds) throw new AppError("Data hasil trim tidak valid.", 400, "INVALID_TRIM"); kind = "STUDENT_EDIT";
      }
    }
    const objectKey = createVideoObjectKey(kind === "REFERENCE" ? "references" : "submissions", course.id, user.id, `${randomUUID()}.mp4`);
    const asset = await db.videoAsset.create({ data: { ownerId: user.id, courseId: course.id, parentAssetId: parent?.id, kind, objectKey, originalName: input.fileName, contentType: input.contentType, sizeBytes: input.sizeBytes, durationSeconds: input.durationSeconds, codec: "H.264/AAC", trimStartSeconds: input.trimStartSeconds, trimEndSeconds: input.trimEndSeconds } });
    const upload = await createPresignedUpload({ objectKey, maxSize: input.sizeBytes });
    return Response.json({ data: { assetId: asset.id, upload } });
  } catch (error) { return errorResponse(error); }
}
