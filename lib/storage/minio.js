import "server-only";
import * as Minio from "minio";

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

export async function createPresignedUpload({ objectKey, maxSize }) {
  const policy = minio.newPostPolicy();
  policy.setBucket(VIDEO_BUCKET);
  policy.setKey(objectKey);
  policy.setExpires(new Date(Date.now() + 10 * 60 * 1000));
  policy.setContentLengthRange(1, maxSize);
  policy.setContentType("video/mp4");
  return minio.presignedPostPolicy(policy);
}

export async function createPlaybackUrl(objectKey) {
  return minio.presignedGetObject(VIDEO_BUCKET, objectKey, 60 * 60);
}

export async function statVideo(objectKey) {
  return minio.statObject(VIDEO_BUCKET, objectKey);
}

export async function storageIsHealthy() {
  return minio.bucketExists(VIDEO_BUCKET);
}
