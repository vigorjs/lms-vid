import { db, dbTransactionOptions } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  listMultipartParts,
  statVideoIfExists,
} from "@/lib/storage/minio";
import { MAX_VIDEO_BYTES } from "@/lib/video/constants";
import { normalizeUploadedParts } from "@/lib/video/multipart";
import { AppError, errorResponse } from "@/lib/errors";

function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL || "http://localhost:3000";
  if (origin && origin !== expected) throw new AppError("Origin request tidak diizinkan.", 403, "INVALID_ORIGIN");
}

async function findAsset(videoId, user) {
  const asset = await db.videoAsset.findUnique({ where: { id: videoId }, include: { course: true } });
  if (!asset || asset.ownerId !== user.id) throw new AppError("Upload tidak ditemukan.", 404, "NOT_FOUND");
  if (asset.kind === "REFERENCE" && !canManageCourse(user, asset.course)) {
    throw new AppError("Tidak diizinkan.", 403, "FORBIDDEN");
  }
  return asset;
}

function assertValidObjectSize(asset, stat) {
  if (Number(stat.size) !== asset.sizeBytes || Number(stat.size) > MAX_VIDEO_BYTES) {
    throw new AppError("Ukuran object tidak sesuai upload intent.", 400, "INVALID_OBJECT");
  }
}

function validateParts(asset, uploadedParts) {
  const parts = normalizeUploadedParts(asset.sizeBytes, asset.multipartPartSize, uploadedParts);
  if (!parts) throw new AppError("Part upload belum lengkap atau tidak sesuai intent.", 400, "INVALID_UPLOAD_PART");
  return parts;
}

async function ensureMultipartObject(asset) {
  const existing = await statVideoIfExists(asset.objectKey);
  if (existing) {
    assertValidObjectSize(asset, existing);
    return;
  }

  if (!asset.multipartUploadId || !asset.multipartPartSize) {
    throw new AppError("Sesi multipart tidak ditemukan.", 409, "MULTIPART_NOT_FOUND");
  }
  const uploadedParts = await listMultipartParts(asset.objectKey, asset.multipartUploadId);
  const completionParts = validateParts(asset, uploadedParts);

  try {
    await completeMultipartUpload(asset.objectKey, asset.multipartUploadId, completionParts);
  } catch (error) {
    const completedByAnotherRequest = await statVideoIfExists(asset.objectKey);
    if (!completedByAnotherRequest) throw error;
  }

  const stat = await statVideoIfExists(asset.objectKey);
  if (!stat) throw new AppError("Object hasil multipart tidak ditemukan.", 502, "OBJECT_NOT_FOUND");
  assertValidObjectSize(asset, stat);
}

async function readyResult(asset, submissionId, client = db) {
  if (asset.kind === "REFERENCE") return { assetId: asset.id, submissionId: null };
  const submission = await client.submission.findFirst({
    where: asset.kind === "STUDENT_ORIGINAL"
      ? { originalVideoId: asset.id, studentId: asset.ownerId }
      : { id: String(submissionId || ""), activeVideoId: asset.id, studentId: asset.ownerId },
    select: { id: true },
  });
  return { assetId: asset.id, submissionId: submission?.id || null };
}

async function finalizeAsset(asset, user, submissionId) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.videoAsset.updateMany({
      where: { id: asset.id, status: "UPLOADING" },
      data: { status: "READY", multipartUploadId: null },
    });
    if (claimed.count === 0) return readyResult(asset, submissionId, tx);

    if (asset.kind === "REFERENCE") {
      await tx.course.update({ where: { id: asset.courseId }, data: { referenceVideoId: asset.id } });
      return { assetId: asset.id, submissionId: null };
    }

    if (asset.kind === "STUDENT_ORIGINAL") {
      const aggregate = await tx.submission.aggregate({
        where: { courseId: asset.courseId, studentId: user.id },
        _max: { attemptNumber: true },
      });
      const referenceVideoId = asset.course.referenceVideoId;
      if (!referenceVideoId) throw new AppError("Video referensi course tidak tersedia.", 409, "REFERENCE_NOT_FOUND");
      const submission = await tx.submission.create({
        data: {
          courseId: asset.courseId,
          studentId: user.id,
          originalVideoId: asset.id,
          activeVideoId: asset.id,
          referenceVideoId,
          attemptNumber: (aggregate._max.attemptNumber || 0) + 1,
        },
      });
      await tx.videoAsset.update({
        where: { id: asset.id },
        data: { submissionId: submission.id, versionNumber: 0 },
      });
      return { assetId: asset.id, submissionId: submission.id };
    }

    const submission = await tx.submission.findFirst({
      where: { id: String(submissionId || ""), studentId: user.id, courseId: asset.courseId, status: "DRAFT" },
    });
    if (!submission) throw new AppError("Draft submission tidak ditemukan.", 404, "DRAFT_NOT_FOUND");
    await tx.submission.update({ where: { id: submission.id }, data: { activeVideoId: asset.id } });
    return { assetId: asset.id, submissionId: submission.id };
  }, dbTransactionOptions);
}

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await authorize();
    const { videoId } = await params;
    const body = await request.json().catch(() => ({}));
    const asset = await findAsset(videoId, user);

    if (asset.status === "READY") return Response.json({ data: await readyResult(asset, body.submissionId) });
    if (asset.status !== "UPLOADING") throw new AppError("Upload tidak dapat diselesaikan.", 409, "INVALID_UPLOAD_STATUS");

    await ensureMultipartObject(asset);
    return Response.json({ data: await finalizeAsset(asset, user, body.submissionId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await authorize();
    const { videoId } = await params;
    const asset = await findAsset(videoId, user);

    if (asset.status === "FAILED") return new Response(null, { status: 204 });
    if (asset.status !== "UPLOADING") throw new AppError("Upload yang sudah selesai tidak dapat dibatalkan.", 409, "INVALID_UPLOAD_STATUS");
    if (!asset.multipartUploadId) throw new AppError("Sesi multipart tidak ditemukan.", 409, "MULTIPART_NOT_FOUND");

    try {
      await abortMultipartUpload(asset.objectKey, asset.multipartUploadId);
    } catch (error) {
      const completed = await statVideoIfExists(asset.objectKey);
      if (completed) throw new AppError("Upload sudah selesai dan tidak dapat dibatalkan.", 409, "UPLOAD_ALREADY_COMPLETED");
      if (error?.code !== "NoSuchUpload") throw error;
    }
    await db.videoAsset.update({
      where: { id: asset.id },
      data: { status: "FAILED", multipartUploadId: null },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
