export async function readyVideoResult(asset, client) {
  if (asset.kind === "REFERENCE") return { assetId: asset.id, submissionId: null, status: "READY" };
  const submission = await client.submission.findFirst({
    where: asset.kind === "STUDENT_ORIGINAL"
      ? { originalVideoId: asset.id, studentId: asset.ownerId }
      : { id: asset.submissionId || "", activeVideoId: asset.id, studentId: asset.ownerId },
    select: { id: true },
  });
  return { assetId: asset.id, submissionId: submission?.id || null, status: "READY" };
}

export async function finalizeProcessedVideo(db, assetId, { objectKey, sizeBytes, processingError = null }, transactionOptions) {
  return db.$transaction(async (tx) => {
    const asset = await tx.videoAsset.findUnique({ where: { id: assetId }, include: { course: true } });
    if (!asset) throw new Error("Video tidak ditemukan.");
    if (asset.status === "READY") return readyVideoResult(asset, tx);
    if (asset.status !== "PROCESSING") throw new Error("Video tidak sedang diproses.");

    const claimed = await tx.videoAsset.updateMany({
      where: { id: asset.id, status: "PROCESSING" },
      data: { status: "READY", objectKey, sizeBytes, processingError, contentType: "video/mp4", codec: "H.264/AAC" },
    });
    if (!claimed.count) return readyVideoResult(asset, tx);

    let submissionId = null;
    if (asset.kind === "REFERENCE") {
      await tx.course.update({ where: { id: asset.courseId }, data: { referenceVideoId: asset.id } });
    } else if (asset.kind === "STUDENT_ORIGINAL") {
      const existingDraft = await tx.submission.findFirst({ where: { courseId: asset.courseId, studentId: asset.ownerId, status: "DRAFT" }, select: { id: true } });
      if (existingDraft) throw new Error("Student sudah memiliki draft aktif.");
      const referenceVideoId = asset.course?.referenceVideoId;
      if (!referenceVideoId) throw new Error("Video referensi course tidak tersedia.");
      const aggregate = await tx.submission.aggregate({
        where: { courseId: asset.courseId, studentId: asset.ownerId },
        _max: { attemptNumber: true },
      });
      const submission = await tx.submission.create({
        data: {
          courseId: asset.courseId,
          studentId: asset.ownerId,
          originalVideoId: asset.id,
          activeVideoId: asset.id,
          referenceVideoId,
          attemptNumber: (aggregate._max.attemptNumber || 0) + 1,
        },
      });
      submissionId = submission.id;
      await tx.videoAsset.update({ where: { id: asset.id }, data: { submissionId, versionNumber: 0 } });
    } else {
      const submission = await tx.submission.findFirst({
        where: { id: asset.submissionId || "", studentId: asset.ownerId, courseId: asset.courseId, status: "DRAFT" },
      });
      if (!submission) throw new Error("Draft submission tidak ditemukan.");
      await tx.submission.update({ where: { id: submission.id }, data: { activeVideoId: asset.id } });
      submissionId = submission.id;
    }

    await tx.videoProcessingJob.update({
      where: { assetId: asset.id },
      data: { status: "COMPLETE", leaseUntil: null, lastError: processingError },
    });
    return { assetId: asset.id, submissionId, status: "READY" };
  }, transactionOptions);
}
