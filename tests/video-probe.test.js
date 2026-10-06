import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { hasFastStart, isDirectPlayCompatible } from "../worker/video-probe.mjs";

const directories = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function atom(type) {
  const result = Buffer.alloc(8);
  result.writeUInt32BE(8, 0);
  result.write(type, 4, "ascii");
  return result;
}

async function mp4File(atoms) {
  const directory = await mkdtemp(path.join(tmpdir(), "lms-probe-test-"));
  directories.push(directory);
  const file = path.join(directory, "video.mp4");
  await writeFile(file, Buffer.concat(atoms.map(atom)));
  return file;
}

it("skips encoding only for browser-compatible videos within 720p and 30 fps", () => {
  const video = { codec_type: "video", codec_name: "h264", pix_fmt: "yuv420p", width: 1280, height: 720, avg_frame_rate: "30/1", r_frame_rate: "30/1" };
  const audio = { codec_type: "audio", codec_name: "aac" };
  expect(isDirectPlayCompatible([video, audio])).toBe(true);
  expect(isDirectPlayCompatible([video])).toBe(true);
  expect(isDirectPlayCompatible([{ ...video, codec_name: "hevc" }, audio])).toBe(false);
  expect(isDirectPlayCompatible([{ ...video, pix_fmt: "yuv420p10le" }, audio])).toBe(false);
  expect(isDirectPlayCompatible([{ ...video, width: 1920 }, audio])).toBe(false);
  expect(isDirectPlayCompatible([{ ...video, r_frame_rate: "60/1" }, audio])).toBe(false);
  expect(isDirectPlayCompatible([video, { ...audio, codec_name: "opus" }])).toBe(false);
});

it("distinguishes MP4 files that can play before downloading their video data", async () => {
  expect(await hasFastStart(await mp4File(["ftyp", "moov", "mdat"]))).toBe(true);
  expect(await hasFastStart(await mp4File(["ftyp", "mdat", "moov"]))).toBe(false);
  expect(await hasFastStart(await mp4File(["ftyp", "moov"]))).toBe(false);
});
