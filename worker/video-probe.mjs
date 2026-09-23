import { spawn } from "node:child_process";
import { open, stat } from "node:fs/promises";

function frameRateAtMost30(value) {
  if (typeof value !== "string") return false;
  const [numerator, denominator] = value.split("/").map(Number);
  return Number.isFinite(numerator) && Number.isFinite(denominator)
    && numerator > 0 && denominator > 0 && numerator <= denominator * 30;
}

export function isDirectPlayCompatible(streams) {
  if (!Array.isArray(streams)) return false;
  const videos = streams.filter((stream) => stream.codec_type === "video");
  const audios = streams.filter((stream) => stream.codec_type === "audio");
  if (videos.length !== 1 || audios.some((stream) => stream.codec_name !== "aac")) return false;
  const video = videos[0];
  return video.codec_name === "h264"
    && video.pix_fmt === "yuv420p"
    && Number.isInteger(video.width) && video.width > 0 && video.width <= 1280
    && Number.isInteger(video.height) && video.height > 0 && video.height <= 720
    && frameRateAtMost30(video.avg_frame_rate)
    && frameRateAtMost30(video.r_frame_rate);
}

export async function probeVideo(file) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,r_frame_rate", "-of", "json", file], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk) => { output = `${output}${chunk}`.slice(-128_000); });
    child.stderr.on("data", (chunk) => { errors = `${errors}${chunk}`.slice(-2000); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`FFprobe keluar dengan kode ${code}: ${errors}`));
      try { resolve(JSON.parse(output).streams); }
      catch (error) { reject(error); }
    });
  });
}

export async function hasFastStart(file) {
  const size = (await stat(file)).size;
  const handle = await open(file, "r");
  try {
    let offset = 0;
    let moovSeen = false;
    while (offset + 8 <= size) {
      const header = Buffer.alloc(16);
      const { bytesRead } = await handle.read(header, 0, 16, offset);
      if (bytesRead < 8) return false;
      const type = header.toString("ascii", 4, 8);
      let atomSize = header.readUInt32BE(0);
      let headerSize = 8;
      if (atomSize === 1) {
        if (bytesRead < 16) return false;
        atomSize = Number(header.readBigUInt64BE(8));
        headerSize = 16;
      } else if (atomSize === 0) atomSize = size - offset;
      if (!Number.isSafeInteger(atomSize) || atomSize < headerSize || offset + atomSize > size) return false;
      if (type === "moov") moovSeen = true;
      if (type === "mdat") return moovSeen;
      offset += atomSize;
    }
    return false;
  } finally {
    await handle.close();
  }
}
