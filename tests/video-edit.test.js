import { describe, expect, it } from "vitest";
import { buildFfmpegArgs, normalizeCrop, outputDuration } from "@/lib/video/edit-spec";
import { videoEditSpecSchema } from "@/lib/validation";

const spec = {
  segments: [
    { startSeconds: 2, endSeconds: 5 },
    { startSeconds: 10, endSeconds: 14 },
  ],
  crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8, aspect: 1 },
  rotation: 90,
  flipHorizontal: true,
  flipVertical: false,
  speed: 0.25,
  volume: 0.75,
  muted: false,
};

describe("advanced video edit specification", () => {
  it("calculates output duration from ordered segments and speed", () => {
    expect(outputDuration(spec)).toBe(28);
  });

  it("keeps crop coordinates inside normalized video bounds", () => {
    expect(normalizeCrop({ x: 0.8, y: -1, width: 0.5, height: 2, aspect: 1 })).toEqual({
      x: 0.5,
      y: 0,
      width: 0.5,
      height: 1,
      aspect: 1,
    });
  });

  it("builds multi-segment video and chained slow-motion audio filters", () => {
    const args = buildFfmpegArgs(spec, { hasAudio: true });
    const filters = args[args.indexOf("-filter_complex") + 1];
    expect(filters).toContain("concat=n=2:v=1:a=0");
    expect(filters).toContain("transpose=1");
    expect(filters).toContain("hflip");
    expect(filters.match(/atempo=0.5/g)).toHaveLength(2);
    expect(args).toContain("[aout]");
  });

  it("omits audio when the edit is muted", () => {
    const args = buildFfmpegArgs({ ...spec, muted: true });
    expect(args).toContain("-an");
    expect(args).not.toContain("[aout]");
  });

  it("rejects invalid segment and crop ranges", () => {
    expect(videoEditSpecSchema.safeParse({ ...spec, segments: [{ startSeconds: 2, endSeconds: 2.05 }] }).success).toBe(false);
    expect(videoEditSpecSchema.safeParse({ ...spec, crop: { x: 0.8, y: 0, width: 0.5, height: 1, aspect: 1 } }).success).toBe(false);
  });
});
