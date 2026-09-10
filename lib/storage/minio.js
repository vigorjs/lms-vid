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
  });
}

export const minio = globalForMinio.__pjokvidMinio || createMinioClient();
if (process.env.NODE_ENV !== "production") globalForMinio.__pjokvidMinio = minio;

export const VIDEO_BUCKET = process.env.MINIO_BUCKET || "lms-videos";
export const VIDEO_FOLDER = (process.env.MINIO_FOLDER || "pjokvid").replace(/^\/+|\/+$/g, "");

export function createVideoObjectKey(...segments) {
  return [VIDEO_FOLDER, ...segments].filter(Boolean).join("/");
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

export async function statVideoIfExists(objectKey) {
  try {
    return await statVideo(objectKey);
  } catch (error) {
    if (["NoSuchKey", "NotFound", "NoSuchObject"].includes(error?.code)) return null;
    throw error;
  }
}

export async function storageIsHealthy() {
  return minio.bucketExists(VIDEO_BUCKET);
}
