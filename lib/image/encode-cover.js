import { COVER_QUALITY, MAX_COVER_OUTPUT_BYTES } from "./constants";

export async function encodeCover(canvas) {
  let oversized = false;
  for (const type of ["image/webp", "image/jpeg"]) {
    if (type === "image/jpeg") {
      const context = canvas.getContext("2d");
      context.save();
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }
    for (const quality of [COVER_QUALITY, 0.72, 0.62]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
      // Unsupported encoders may silently return PNG instead of the requested type.
      if (!blob || blob.type !== type || blob.size === 0) break;
      if (blob.size <= MAX_COVER_OUTPUT_BYTES) return blob;
      oversized = true;
    }
  }
  throw new Error(oversized
    ? "Hasil crop melebihi 2 MB. Coba pilih area gambar yang lebih kecil."
    : "Browser gagal mengonversi gambar. Coba muat ulang halaman atau gunakan browser lain.");
}
