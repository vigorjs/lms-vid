import "dotenv/config";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import * as Minio from "minio";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { finalizeProcessedVideo } from "../lib/video/finalize.js";
import { MAX_VIDEO_BYTES } from "../lib/video/constants.js";
import { claimJob } from "./queue.mjs";
import { hasFastStart, isDirectPlayCompatible, probeVideo } from "./video-probe.mjs";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 }) });
const minio = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
  region: process.env.MINIO_REGION || "us-east-1",
});
const bucket = process.env.MINIO_BUCKET || "lms-videos";
const retryLimit = 3;
let stopping = false;

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";
    child.stderr.on("data", (chunk) => { errorOutput = `${errorOutput}${chunk}`.slice(-2000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg keluar dengan kode ${code}: ${errorOutput}`)));
  });
}

async function encode(source, target) {
  await runFfmpeg([
    "-i", source, "-map", "0:v:0", "-map", "0:a:0?",
    "-vf", "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-r", "30", "-c:v", "libx264", "-threads", "1", "-preset", "veryfast",
    "-crf", "28", "-maxrate", "1000k", "-bufsize", "2000k", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", target,
  ]);
}

async function processJob(job) {
  const startedAt = Date.now();
  const directory = await mkdtemp(path.join(tmpdir(), "lms-video-"));
  const source = path.join(directory, "source.mp4");
  const encoded = path.join(directory, "encoded.mp4");
  const remuxed = path.join(directory, "remuxed.mp4");
  const heartbeat = setInterval(() => {
    db.videoProcessingJob.updateMany({
      where: { assetId: job.assetId, status: "RUNNING" },
      data: { leaseUntil: new Date(Date.now() + 30 * 60 * 1000) },
    }).catch((error) => console.error("Heartbeat worker gagal:", error));
  }, 30_000);

  try {
    const asset = await db.videoAsset.findUnique({ where: { id: job.assetId } });
    if (!asset || asset.status !== "PROCESSING") {
      await db.videoProcessingJob.update({ where: { assetId: job.assetId }, data: { status: "COMPLETE", leaseUntil: null } });
      return;
    }
    await pipeline(await minio.getObject(bucket, job.sourceKey), createWriteStream(source));
    const downloadedAt = Date.now();
    let streams;
    try { streams = await probeVideo(source); }
    catch (error) { console.warn(`FFprobe ${job.assetId} gagal; mencoba encode:`, error.message); }
    const compatible = isDirectPlayCompatible(streams);
    if (compatible && await hasFastStart(source).catch(() => false)) {
      await finalizeProcessedVideo(db, job.assetId, { objectKey: job.sourceKey, sizeBytes: asset.sizeBytes }, { maxWait: 10_000, timeout: 15_000 });
      await cleanupSource(job.assetId, job.sourceKey, job.sourceKey);
      console.info(`Video ${job.assetId} siap langsung (${asset.sizeBytes} byte; antrean ${startedAt - new Date(job.createdAt).getTime()} ms, unduh ${downloadedAt - startedAt} ms, proses ${Date.now() - downloadedAt} ms).`);
      return;
    }

    let candidate;
    let mode;
    if (compatible) {
      await runFfmpeg(["-i", source, "-map", "0:v:0", "-map", "0:a?", "-c", "copy", "-movflags", "+faststart", remuxed]);
      candidate = remuxed;
      mode = "remux";
    } else {
      await encode(source, encoded);
      candidate = encoded;
      mode = "encode";
      if ((await stat(encoded)).size >= asset.sizeBytes) {
        await runFfmpeg(["-i", source, "-map", "0", "-c", "copy", "-movflags", "+faststart", remuxed]);
        candidate = remuxed;
        mode = "remux setelah encode";
      }
    }
    const outputSize = (await stat(candidate)).size;
    if (!outputSize || outputSize > MAX_VIDEO_BYTES) throw new Error("Hasil video melebihi batas ukuran.");

    const processedAt = Date.now();
    await minio.fPutObject(bucket, job.outputKey, candidate, { "Content-Type": "video/mp4" });
    await finalizeProcessedVideo(db, job.assetId, { objectKey: job.outputKey, sizeBytes: outputSize }, { maxWait: 10_000, timeout: 15_000 });
    await cleanupSource(job.assetId, job.sourceKey, job.outputKey);
    console.info(`Video ${job.assetId} siap via ${mode} (${outputSize} byte; antrean ${startedAt - new Date(job.createdAt).getTime()} ms, unduh ${downloadedAt - startedAt} ms, proses ${processedAt - downloadedAt} ms, unggah/finalisasi ${Date.now() - processedAt} ms).`);
  } finally {
    clearInterval(heartbeat);
    await rm(directory, { recursive: true, force: true });
  }
}

async function cleanupSource(assetId, sourceKey, outputKey) {
  try {
    if (sourceKey !== outputKey) await minio.removeObject(bucket, sourceKey);
    await db.videoProcessingJob.update({ where: { assetId }, data: { sourceDeletedAt: new Date() } });
  } catch (error) {
    console.error(`Pembersihan sumber ${assetId} gagal:`, error);
  }
}

async function cleanupCompletedSources() {
  const cleanupJobs = await db.videoProcessingJob.findMany({
    where: { status: "COMPLETE", sourceDeletedAt: null },
    include: { asset: { select: { objectKey: true } } },
  });
  for (const job of cleanupJobs) {
    if (job.asset?.objectKey === job.outputKey) await cleanupSource(job.assetId, job.sourceKey, job.outputKey);
    else await db.videoProcessingJob.update({ where: { assetId: job.assetId }, data: { sourceDeletedAt: new Date() } });
  }
}

async function recoverAfterRestart() {
  await db.videoProcessingJob.updateMany({ where: { status: "RUNNING" }, data: { leaseUntil: new Date(0) } });
  const tempEntries = await readdir(tmpdir(), { withFileTypes: true });
  for (const entry of tempEntries) {
    if (entry.isDirectory() && entry.name.startsWith("lms-video-")) {
      await rm(path.join(tmpdir(), entry.name), { recursive: true, force: true });
    }
  }
  await cleanupCompletedSources();
}

async function handleFailure(job, error) {
  const message = String(error?.message || error).slice(0, 1000);
  console.error(`Pemrosesan ${job.assetId} gagal (percobaan ${job.attempts}):`, message);
  if (job.attempts < retryLimit) {
    await db.videoProcessingJob.update({
      where: { assetId: job.assetId },
      data: { status: "PENDING", leaseUntil: null, lastError: message },
    });
    return;
  }

  try {
    const source = await minio.statObject(bucket, job.sourceKey);
    await finalizeProcessedVideo(db, job.assetId, {
      objectKey: job.sourceKey,
      sizeBytes: Number(source.size),
      processingError: message,
    }, { maxWait: 10_000, timeout: 15_000 });
    await minio.removeObject(bucket, job.outputKey).catch((cleanupError) => console.error("Pembersihan hasil gagal:", cleanupError));
    await db.videoProcessingJob.update({ where: { assetId: job.assetId }, data: { sourceDeletedAt: new Date() } });
  } catch (fallbackError) {
    console.error(`Fallback ${job.assetId} gagal:`, fallbackError);
    await db.$transaction([
      db.videoAsset.updateMany({ where: { id: job.assetId, status: "PROCESSING" }, data: { status: "FAILED", processingError: message } }),
      db.videoProcessingJob.update({ where: { assetId: job.assetId }, data: { status: "COMPLETE", leaseUntil: null, lastError: message } }),
    ]);
    await minio.removeObject(bucket, job.outputKey).catch((cleanupError) => console.error("Pembersihan hasil gagal:", cleanupError));
  }
}

try {
  await recoverAfterRestart();
  let lastCleanup = Date.now();
  while (!stopping) {
    const job = await claimJob(db);
    if (job) {
      try { await processJob(job); }
      catch (error) { await handleFailure(job, error); }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (Date.now() - lastCleanup > 60_000) {
      await cleanupCompletedSources();
      lastCleanup = Date.now();
    }
  }
} finally {
  await db.$disconnect();
}
