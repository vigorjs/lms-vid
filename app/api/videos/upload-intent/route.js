import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { uploadIntentSchema } from "@/lib/validation";
import {
  abortMultipartUpload,
  createMultipartPartUrls,
  createVideoObjectKey,
  initiateMultipartUpload,
} from "@/lib/storage/minio";
import { MULTIPART_PART_SIZE_BYTES } from "@/lib/video/constants";
import { outputDuration } from "@/lib/video/edit-spec";
import { createMultipartPlan } from "@/lib/video/multipart";
import { AppError, errorResponse } from "@/lib/errors";

function assertSameOrigin(request) {
  const origin = request.headers.get("origin"); const expected = process.env.APP_URL || "http://localhost:3000";
  if (origin && origin !== expected) throw new AppError("Origin request tidak diizinkan.", 403, "INVALID_ORIGIN");
}

async function resolveUploadContext(user, input) {
  const course = await db.course.findUnique({ where: { id: input.courseId }, include: { referenceVideo: true } });
  if (!course) throw new AppError("Course tidak ditemukan.", 404, "NOT_FOUND");

  if (input.purpose === "REFERENCE") {
    if (!canManageCourse(user, course)) throw new AppError("Tidak boleh mengubah video course ini.", 403, "FORBIDDEN");
    return { course, kind: "REFERENCE", parent: null, submission: null, editSpec: null };
  }

  if (user.role !== "STUDENT" || course.status !== "PUBLISHED" || !course.referenceVideoId) {
    throw new AppError("Course belum dapat digunakan untuk latihan.", 403, "FORBIDDEN");
  }

  if (input.purpose === "STUDENT_ORIGINAL") {
    const draft = await db.submission.findFirst({ where: { courseId: course.id, studentId: user.id, status: "DRAFT" } });
    if (draft) throw new AppError("Selesaikan draft aktif sebelum membuat attempt baru.", 409, "DRAFT_EXISTS");
    return { course, kind: "STUDENT_ORIGINAL", parent: null, submission: null, editSpec: null };
  }

  const parent = await db.videoAsset.findFirst({
    where: { id: input.parentAssetId, ownerId: user.id, courseId: course.id, status: "READY" },
  });
  const submission = await db.submission.findFirst({
    where: { id: input.submissionId, studentId: user.id, courseId: course.id, status: "DRAFT" },
  });
  const editSpec = input.editSpec || (input.trimStartSeconds !== undefined && input.trimEndSeconds !== undefined ? {
    segments: [{ startSeconds: input.trimStartSeconds, endSeconds: input.trimEndSeconds }],
    crop: null,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    speed: 1,
    volume: 1,
    muted: false,
  } : null);
  const sourceDuration = parent?.durationSeconds || 0;
  const segmentsValid = editSpec?.segments.every((segment) => segment.endSeconds <= sourceDuration + 0.01);
  const expectedDuration = editSpec ? outputDuration(editSpec) : 0;
  if (!parent || !submission || submission.activeVideoId !== parent.id || !editSpec || !segmentsValid || Math.abs(expectedDuration - input.durationSeconds) > 0.1) {
    throw new AppError("Data hasil edit tidak valid.", 400, "INVALID_EDIT");
  }
  return { course, kind: "STUDENT_EDIT", parent, submission, editSpec };
}

async function createAsset(data, submission) {
  if (!submission) return db.videoAsset.create({ data });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const aggregate = await db.videoAsset.aggregate({
        where: { submissionId: submission.id },
        _max: { versionNumber: true },
      });
      return await db.videoAsset.create({
        data: { ...data, submissionId: submission.id, versionNumber: (aggregate._max.versionNumber ?? 0) + 1 },
      });
    } catch (error) {
      if (error?.code !== "P2002" || attempt === 2) throw error;
    }
  }
}

export async function POST(request) {
  let uploadId;
  let objectKey;
  let assetId;

  try {
    assertSameOrigin(request);
    const user = await authorize();
    const input = uploadIntentSchema.parse(await request.json());
    const { course, kind, parent, submission, editSpec } = await resolveUploadContext(user, input);
    const plan = createMultipartPlan(input.sizeBytes);

    objectKey = createVideoObjectKey(
      kind === "REFERENCE" ? "references" : "submissions",
      course.id,
      user.id,
      `${randomUUID()}.mp4`,
    );
    uploadId = await initiateMultipartUpload(objectKey);

    const singleSegment = editSpec?.segments.length === 1 ? editSpec.segments[0] : null;
    const asset = await createAsset({
        ownerId: user.id,
        courseId: course.id,
        parentAssetId: parent?.id,
        kind,
        objectKey,
        multipartUploadId: uploadId,
        multipartPartSize: MULTIPART_PART_SIZE_BYTES,
        originalName: input.fileName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        durationSeconds: input.durationSeconds,
        codec: "H.264/AAC",
        trimStartSeconds: singleSegment?.startSeconds,
        trimEndSeconds: singleSegment?.endSeconds,
        ...(editSpec ? { editSpec } : {}),
      }, submission);
    assetId = asset.id;

    const parts = await createMultipartPartUrls(objectKey, uploadId, plan.length);
    return Response.json({ data: { assetId: asset.id, partSizeBytes: MULTIPART_PART_SIZE_BYTES, parts } });
  } catch (error) {
    if (uploadId && objectKey) await abortMultipartUpload(objectKey, uploadId).catch(() => {});
    if (assetId) await db.videoAsset.update({
      where: { id: assetId },
      data: { status: "FAILED", multipartUploadId: null },
    }).catch(() => {});
    return errorResponse(error);
  }
}
