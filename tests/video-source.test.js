import { expect, it } from "vitest";
import { videoSourceType } from "@/lib/video/source";
import { uploadIntentSchema } from "@/lib/validation";

it("accepts iPhone MOV even when the picker omits the MIME type", () => {
  for (const type of ["", "video/quicktime", "application/octet-stream"]) {
    const contentType = videoSourceType({ name: "IMG_0123.MOV", type });
    expect(contentType).toBe("video/quicktime");
    expect(uploadIntentSchema.safeParse({ courseId: "course", purpose: "REFERENCE", fileName: "IMG_0123.MOV", contentType, sizeBytes: 1024, durationSeconds: 30 }).success).toBe(true);
  }
});

it("keeps MP4 and normalizes M4V uploads", () => {
  expect(videoSourceType({ name: "clip.mp4", type: "" })).toBe("video/mp4");
  expect(videoSourceType({ name: "clip.m4v", type: "video/x-m4v" })).toBe("video/mp4");
});

it("rejects unsupported files instead of labeling them MP4", () => {
  expect(() => videoSourceType({ name: "photo.jpg", type: "image/jpeg" })).toThrow("MP4 atau MOV");
});
