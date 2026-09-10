import { describe, expect, it } from "vitest";
import { hasWebpSignature } from "@/lib/image/validation";
import { getCourseCoverUrl } from "@/lib/image/url";

describe("cover image validation", () => {
  it("menerima signature RIFF/WEBP", () => {
    expect(hasWebpSignature(Buffer.from("RIFF0000WEBP", "ascii"))).toBe(true);
  });

  it("menolak file yang bukan WebP", () => {
    expect(hasWebpSignature(Buffer.from("not-an-image", "ascii"))).toBe(false);
  });
});

describe("course cover URL", () => {
  it("menggunakan timestamp sebagai cache version", () => {
    const date = new Date("2026-09-10T08:00:00.000Z");
    expect(getCourseCoverUrl({ id: "course-1", coverImageKey: "covers/course-1/a.webp", coverUpdatedAt: date }))
      .toBe(`/api/courses/course-1/cover?v=${date.getTime()}`);
  });

  it("mengembalikan null ketika course belum memiliki cover", () => {
    expect(getCourseCoverUrl({ id: "course-1", coverImageKey: null })).toBeNull();
  });
});
