import { describe, expect, it, vi } from "vitest";
import { encodeCover } from "@/lib/image/encode-cover";
import { MAX_COVER_OUTPUT_BYTES } from "@/lib/image/constants";
import { coverUploadIntentSchema } from "@/lib/validation";

function canvasWith(encode) {
  return {
    width: 1280, height: 720,
    getContext: () => ({ save() {}, restore() {}, fillRect() {} }),
    toBlob: vi.fn((callback, type, quality) => callback(encode(type, quality))),
  };
}

describe("cover encoding", () => {
  it("uses JPEG when the browser returns PNG for a WebP request", async () => {
    const canvas = canvasWith((type) => new Blob(["image"], { type: type === "image/webp" ? "image/png" : type }));
    const blob = await encodeCover(canvas);
    expect(blob.type).toBe("image/jpeg");
    expect(coverUploadIntentSchema.safeParse({ fileName: "cover.jpg", contentType: blob.type, sizeBytes: blob.size }).success).toBe(true);
    expect(canvas.toBlob).toHaveBeenCalledTimes(2);
  });

  it("keeps WebP where encoding is supported", async () => {
    const canvas = canvasWith((type) => new Blob(["image"], { type }));
    expect((await encodeCover(canvas)).type).toBe("image/webp");
  });

  it("reduces quality when the output exceeds the size limit", async () => {
    const canvas = canvasWith((type, quality) => ({ type, size: quality > 0.72 ? MAX_COVER_OUTPUT_BYTES + 1 : 1000 }));
    expect((await encodeCover(canvas)).size).toBe(1000);
  });

  it("does not report failed encoders as an oversized image", async () => {
    await expect(encodeCover(canvasWith(() => null))).rejects.toThrow("Browser gagal mengonversi");
  });

  it("rejects oversized output even after fallback", async () => {
    await expect(encodeCover(canvasWith((type) => ({ type, size: MAX_COVER_OUTPUT_BYTES + 1 })))).rejects.toThrow("melebihi 2 MB");
  });
});
