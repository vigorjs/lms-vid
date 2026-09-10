import { describe, expect, it, vi } from "vitest";
import { uploadIntentSchema } from "@/lib/validation";
import { MAX_VIDEO_BYTES, MULTIPART_PART_SIZE_BYTES } from "@/lib/video/constants";
import { calculateMultipartProgress, createMultipartPlan, normalizeUploadedParts, retryMultipartPart } from "@/lib/video/multipart";

const validIntent = {
  courseId: "course-1",
  purpose: "REFERENCE",
  fileName: "demo.mp4",
  contentType: "video/mp4",
  durationSeconds: 60,
};

describe("multipart upload", () => {
  it("splits an 80 MiB video into sixteen 5 MiB parts", () => {
    const plan = createMultipartPlan(80 * 1024 * 1024);
    expect(plan).toHaveLength(16);
    expect(plan[0]).toEqual({ partNumber: 1, start: 0, end: MULTIPART_PART_SIZE_BYTES, size: MULTIPART_PART_SIZE_BYTES });
    expect(plan.at(-1)?.size).toBe(MULTIPART_PART_SIZE_BYTES);
  });

  it("creates the correct final part for a non-multiple size", () => {
    const plan = createMultipartPlan(MULTIPART_PART_SIZE_BYTES + 1234);
    expect(plan).toHaveLength(2);
    expect(plan[1]).toEqual({
      partNumber: 2,
      start: MULTIPART_PART_SIZE_BYTES,
      end: MULTIPART_PART_SIZE_BYTES + 1234,
      size: 1234,
    });
  });

  it("caps aggregate progress at one hundred percent", () => {
    expect(calculateMultipartProgress(5, 2, 10)).toBe(70);
    expect(calculateMultipartProgress(10, 5, 10)).toBe(100);
  });

  it("normalizes complete parts and rejects missing or incorrectly sized parts", () => {
    const size = MULTIPART_PART_SIZE_BYTES + 1234;
    const complete = [
      { part: 2, size: 1234, etag: "etag-2" },
      { part: 1, size: MULTIPART_PART_SIZE_BYTES, etag: "etag-1" },
    ];
    expect(normalizeUploadedParts(size, MULTIPART_PART_SIZE_BYTES, complete)).toEqual([
      { part: 1, etag: "etag-1" },
      { part: 2, etag: "etag-2" },
    ]);
    expect(normalizeUploadedParts(size, MULTIPART_PART_SIZE_BYTES, complete.slice(0, 1))).toBeNull();
    expect(normalizeUploadedParts(size, MULTIPART_PART_SIZE_BYTES, [{ ...complete[0], size: 2 }, complete[1]])).toBeNull();
  });

  it("retries a failed part and preserves the final result", async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue("uploaded");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(retryMultipartPart(task, { sleep })).resolves.toBe("uploaded");
    expect(task).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not start another attempt after cancellation", async () => {
    const controller = new AbortController();
    const task = vi.fn();
    controller.abort();

    await expect(retryMultipartPart(task, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(task).not.toHaveBeenCalled();
  });

  it("accepts exactly 100 MiB and rejects larger uploads", () => {
    expect(() => uploadIntentSchema.parse({ ...validIntent, sizeBytes: MAX_VIDEO_BYTES })).not.toThrow();
    expect(() => uploadIntentSchema.parse({ ...validIntent, sizeBytes: MAX_VIDEO_BYTES + 1 })).toThrow();
  });
});
