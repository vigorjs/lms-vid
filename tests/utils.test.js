import { describe, expect, it } from "vitest";
import { formatBytes, formatDuration, isSafeRedirect, slugify } from "@/lib/utils";

describe("utility formatters", () => {
  it("formats media duration", () => { expect(formatDuration(65)).toBe("01:05"); expect(formatDuration(3661)).toBe("1:01:01"); });
  it("creates stable Indonesian slugs", () => { expect(slugify("Gaya Kupu-Kupu  Dasar")).toBe("gaya-kupu-kupu-dasar"); });
  it("formats bytes", () => { expect(formatBytes(1024 * 1024)).toBe("1.0 MB"); });
  it("only accepts local redirects", () => { expect(isSafeRedirect("/courses/1")).toBe(true); expect(isSafeRedirect("//evil.test")).toBe(false); });
});
