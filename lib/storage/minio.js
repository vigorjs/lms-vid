import "server-only";
import * as Minio from "minio";
import { MULTIPART_URL_EXPIRY_SECONDS } from "@/lib/video/constants";

const globalForMinio = globalThis;

function createMinioClient() {
  return new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    region: process.env.MINIO_REGION || "us-east-1",
  });
}

export const minio = globalForMinio.__pjokvidMinio || createMinioClient();
if (process.env.NODE_ENV !== "production") globalForMinio.__pjokvidMinio = minio;

export const VIDEO_BUCKET = process.env.MINIO_BUCKET || "lms-videos";
export const VIDEO_FOLDER = (process.env.MINIO_FOLDER || "pjokvid").replace(/^\/+|\/+$/g, "");

export function createVideoObjectKey(...segments) {
  return [VIDEO_FOLDER, ...segments].filter(Boolean).join("/");
}

export const createStorageObjectKey = createVideoObjectKey;

export async function createUploadUrl(objectKey, expirySeconds) {
  return minio.presignedPutObject(VIDEO_BUCKET, objectKey, expirySeconds);
}

export async function initiateMultipartUpload(objectKey) {
  return minio.initiateNewMultipartUpload(VIDEO_BUCKET, objectKey, { "Content-Type": "video/mp4" });
}

export async function createMultipartPartUrls(objectKey, uploadId, partCount) {
  return Promise.all(Array.from({ length: partCount }, async (_, index) => ({
    partNumber: index + 1,
    url: await minio.presignedUrl("PUT", VIDEO_BUCKET, objectKey, MULTIPART_URL_EXPIRY_SECONDS, {
      partNumber: String(index + 1),
      uploadId,
    }),
  })));
}

export async function listMultipartParts(objectKey, uploadId) {
  // MinIO exposes this as an internal TypeScript method, but it is the SDK's
  // canonical implementation for paginated ListParts requests at runtime.
  return minio.listParts(VIDEO_BUCKET, objectKey, uploadId);
}

export async function completeMultipartUpload(objectKey, uploadId, parts) {
  return minio.completeMultipartUpload(VIDEO_BUCKET, objectKey, uploadId, parts);
}

export async function abortMultipartUpload(objectKey, uploadId) {
  return minio.abortMultipartUpload(VIDEO_BUCKET, objectKey, uploadId);
}

export async function createPlaybackUrl(objectKey) {
  return minio.presignedGetObject(VIDEO_BUCKET, objectKey, 60 * 60);
}

export async function statVideo(objectKey) {
  return minio.statObject(VIDEO_BUCKET, objectKey);
}

export const statStorageObject = statVideo;

function storageRequestError(operation, response) {
  const error = new Error(`${operation} storage gagal (${response.status}).`);
  error.code = "StorageRequestFailed";
  error.statusCode = response.status;
  return error;
}

function objectSizeFromResponse(response, fallback) {
  const contentRange = response.headers.get("content-range");
  const rangeMatch = contentRange?.match(/\/(\d+)$/);
  if (rangeMatch) return Number(rangeMatch[1]);

  const contentLength = Number(response.headers.get("content-length"));
  return Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : fallback;
}

export async function readStorageObjectRange(objectKey, length = 16) {
  const safeLength = Math.max(1, Math.floor(Number(length) || 1));
  const url = await createPlaybackUrl(objectKey);
  const response = await fetch(url, {
    headers: { Range: `bytes=0-${safeLength - 1}` },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) throw storageRequestError("Membaca", response);

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer,
    size: objectSizeFromResponse(response, buffer.length),
    contentType: response.headers.get("content-type"),
  };
}

export async function statVideoIfExists(objectKey) {
  const object = await readStorageObjectRange(objectKey, 1);
  return object ? { size: object.size, metaData: {} } : null;
}

export async function readStorageObjectPrefix(objectKey, length = 16) {
  const object = await readStorageObjectRange(objectKey, length);
  if (!object) {
    const error = new Error("Object storage tidak ditemukan.");
    error.code = "NoSuchKey";
    throw error;
  }
  return object.buffer;
}

export async function getStorageObject(objectKey) {
  return minio.getObject(VIDEO_BUCKET, objectKey);
}

export async function removeStorageObject(objectKey) {
  const url = await minio.presignedUrl("DELETE", VIDEO_BUCKET, objectKey, 5 * 60);
  const response = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!response.ok && response.status !== 404) throw storageRequestError("Menghapus", response);
}

export async function storageIsHealthy() {
  return minio.bucketExists(VIDEO_BUCKET);
}
