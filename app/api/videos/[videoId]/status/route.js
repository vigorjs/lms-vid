import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";
import { readyVideoResult } from "@/lib/video/finalize";
import { AppError, errorResponse } from "@/lib/errors";

export async function GET(_request, { params }) {
  try {
    const user = await authorize();
    const { videoId } = await params;
    const asset = await db.videoAsset.findUnique({ where: { id: videoId } });
    if (!asset || asset.ownerId !== user.id) throw new AppError("Video tidak ditemukan.", 404, "NOT_FOUND");
    const result = asset.status === "READY"
      ? await readyVideoResult(asset, db)
      : { assetId: asset.id, submissionId: asset.submissionId, status: asset.status };
    return Response.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
