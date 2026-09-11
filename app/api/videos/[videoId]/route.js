import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { removeStorageObject } from "@/lib/storage/minio";
import { AppError, errorResponse } from "@/lib/errors";

function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL || "http://localhost:3000";
  if (origin && origin !== expected) throw new AppError("Origin request tidak diizinkan.", 403, "INVALID_ORIGIN");
}

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request);
    const user = await authorize(["STUDENT"]);
    const { videoId } = await params;
    const asset = await db.videoAsset.findFirst({
      where: { id: videoId, ownerId: user.id },
      include: { submission: { select: { status: true, activeVideoId: true } } },
    });
    if (!asset || asset.kind !== "STUDENT_EDIT" || asset.status !== "READY" || !asset.submission) {
      throw new AppError("Versi edit tidak ditemukan.", 404, "VERSION_NOT_FOUND");
    }
    if (asset.submission.status !== "DRAFT") throw new AppError("Attempt yang sudah dikirim tidak dapat diubah.", 409, "SUBMISSION_LOCKED");
    if (asset.submission.activeVideoId === asset.id) throw new AppError("Aktifkan versi lain sebelum menghapus versi ini.", 409, "ACTIVE_VERSION");

    const claimed = await db.videoAsset.updateMany({
      where: { id: asset.id, status: "READY" },
      data: { status: "DELETED", deletedAt: new Date() },
    });
    if (!claimed.count) throw new AppError("Versi sedang diubah oleh proses lain.", 409, "VERSION_CHANGED");

    try {
      await removeStorageObject(asset.objectKey);
    } catch (storageError) {
      await db.videoAsset.update({ where: { id: asset.id }, data: { status: "READY", deletedAt: null } }).catch(() => {});
      throw storageError;
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
