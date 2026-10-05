import * as Minio from "minio";

const bucket = process.env.MINIO_BUCKET || "lms-videos";
const client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

for (let attempt = 1; attempt <= 30; attempt++) {
  try {
    if (!await client.bucketExists(bucket)) await client.makeBucket(bucket);
    await client.setBucketPolicy(bucket, "");
    console.info(`MinIO bucket ${bucket} siap dan privat.`);
    process.exit(0);
  } catch (error) {
    if (attempt === 30) throw error;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
