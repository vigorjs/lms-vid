import { describe, expect, it } from "vitest";
import { clampSynchronizedTime, commonDuration, shouldCorrectDrift } from "@/components/video/sync-utils";

describe("video synchronization math", () => {
  it("uses the shortest timeline when two videos exist", () => { expect(commonDuration(20, 12)).toBe(12); expect(commonDuration(20, 0)).toBe(20); });
  it("clamps synchronized seek", () => { expect(clampSynchronizedTime(-2, 10)).toBe(0); expect(clampSynchronizedTime(15, 10)).toBe(10); });
  it("detects meaningful drift", () => { expect(shouldCorrectDrift(10, 10.05)).toBe(false); expect(shouldCorrectDrift(10, 10.2)).toBe(true); });
});
