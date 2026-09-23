import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client.ts";
import { finalizeProcessedVideo } from "@/lib/video/finalize";
import { saveWatchProgress } from "@/lib/progress/update";
import { claimJob } from "../worker/queue.mjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("video processing with PostgreSQL", () => {
  let db;
  beforeAll(() => { db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }); });
  afterAll(async () => { await db?.$disconnect(); });

  it("claims one job and activates an original video exactly once after processing", async () => {
    const suffix = randomUUID();
    const category = await db.category.create({ data: { name: `Category ${suffix}`, slug: `category-${suffix}` } });
    const teacher = await db.user.create({ data: { name: "Teacher", email: `teacher-${suffix}@test.local`, passwordHash: "test", role: "TEACHER" } });
    const student = await db.user.create({ data: { name: "Student", email: `student-${suffix}@test.local`, passwordHash: "test" } });
    const course = await db.course.create({ data: { categoryId: category.id, teacherId: teacher.id, title: "Video processing", slug: `course-${suffix}`, description: "Test course" } });
    const reference = await db.videoAsset.create({ data: { ownerId: teacher.id, courseId: course.id, kind: "REFERENCE", status: "READY", objectKey: `test/${suffix}/reference.mp4`, originalName: "reference.mp4", contentType: "video/mp4", sizeBytes: 1000 } });
    await db.course.update({ where: { id: course.id }, data: { referenceVideoId: reference.id } });
    const asset = await db.videoAsset.create({ data: { ownerId: student.id, courseId: course.id, kind: "STUDENT_ORIGINAL", status: "PROCESSING", objectKey: `test/${suffix}/source.mp4`, originalName: "source.mp4", contentType: "video/mp4", sizeBytes: 1000 } });
    await db.videoProcessingJob.create({ data: { assetId: asset.id, sourceKey: asset.objectKey, outputKey: `test/${suffix}/optimized.mp4` } });

    const claimed = await claimJob(db);
    expect(claimed.assetId).toBe(asset.id);
    expect(claimed.status).toBe("RUNNING");
    expect(claimed.attempts).toBe(1);
    expect(await claimJob(db)).toBeNull();

    const first = await finalizeProcessedVideo(db, asset.id, { objectKey: claimed.outputKey, sizeBytes: 700 }, { maxWait: 10_000, timeout: 15_000 });
    const again = await finalizeProcessedVideo(db, asset.id, { objectKey: claimed.outputKey, sizeBytes: 700 }, { maxWait: 10_000, timeout: 15_000 });
    expect(first.status).toBe("READY");
    expect(again.submissionId).toBe(first.submissionId);
    expect(await db.submission.count({ where: { originalVideoId: asset.id } })).toBe(1);
    expect((await db.videoAsset.findUnique({ where: { id: asset.id } })).objectKey).toBe(claimed.outputKey);
    expect((await db.videoProcessingJob.findUnique({ where: { assetId: asset.id } })).status).toBe("COMPLETE");
  });

  it("keeps the highest watch position when updates arrive together", async () => {
    const suffix = randomUUID();
    const category = await db.category.create({ data: { name: `Progress ${suffix}`, slug: `progress-${suffix}` } });
    const teacher = await db.user.create({ data: { name: "Teacher", email: `progress-teacher-${suffix}@test.local`, passwordHash: "test", role: "TEACHER" } });
    const student = await db.user.create({ data: { name: "Student", email: `progress-student-${suffix}@test.local`, passwordHash: "test" } });
    const course = await db.course.create({ data: { categoryId: category.id, teacherId: teacher.id, title: "Progress", slug: `progress-course-${suffix}`, description: "Test course" } });
    await Promise.all([
      saveWatchProgress(db, { courseId: course.id, studentId: student.id, positionSeconds: 80, durationSeconds: 100 }),
      saveWatchProgress(db, { courseId: course.id, studentId: student.id, positionSeconds: 30, durationSeconds: 100 }),
    ]);
    const progress = await db.watchProgress.findUnique({ where: { courseId_studentId: { courseId: course.id, studentId: student.id } } });
    expect(progress.maxPositionSeconds).toBe(80);
    expect(progress.percent).toBe(80);
  });

  it("publishes a reference and activates an edited version only when ready", async () => {
    const suffix = randomUUID();
    const category = await db.category.create({ data: { name: `Edits ${suffix}`, slug: `edits-${suffix}` } });
    const teacher = await db.user.create({ data: { name: "Teacher", email: `edits-teacher-${suffix}@test.local`, passwordHash: "test", role: "TEACHER" } });
    const student = await db.user.create({ data: { name: "Student", email: `edits-student-${suffix}@test.local`, passwordHash: "test" } });
    const course = await db.course.create({ data: { categoryId: category.id, teacherId: teacher.id, title: "Edits", slug: `edits-course-${suffix}`, description: "Test course" } });
    const reference = await db.videoAsset.create({ data: { ownerId: teacher.id, courseId: course.id, kind: "REFERENCE", status: "PROCESSING", objectKey: `test/${suffix}/reference.mp4`, originalName: "reference.mp4", contentType: "video/mp4", sizeBytes: 1000 } });
    await db.videoProcessingJob.create({ data: { assetId: reference.id, sourceKey: reference.objectKey, outputKey: `test/${suffix}/reference-optimized.mp4` } });
    expect((await db.course.findUnique({ where: { id: course.id } })).referenceVideoId).toBeNull();
    await finalizeProcessedVideo(db, reference.id, { objectKey: `test/${suffix}/reference-optimized.mp4`, sizeBytes: 700 });
    expect((await db.course.findUnique({ where: { id: course.id } })).referenceVideoId).toBe(reference.id);

    const original = await db.videoAsset.create({ data: { ownerId: student.id, courseId: course.id, kind: "STUDENT_ORIGINAL", status: "READY", objectKey: `test/${suffix}/original.mp4`, originalName: "original.mp4", contentType: "video/mp4", sizeBytes: 1000 } });
    const submission = await db.submission.create({ data: { courseId: course.id, studentId: student.id, originalVideoId: original.id, activeVideoId: original.id, referenceVideoId: reference.id, attemptNumber: 1 } });
    const edited = await db.videoAsset.create({ data: { ownerId: student.id, courseId: course.id, submissionId: submission.id, versionNumber: 1, parentAssetId: original.id, kind: "STUDENT_EDIT", status: "PROCESSING", objectKey: `test/${suffix}/edit.mp4`, originalName: "edit.mp4", contentType: "video/mp4", sizeBytes: 1000 } });
    await db.videoProcessingJob.create({ data: { assetId: edited.id, sourceKey: edited.objectKey, outputKey: `test/${suffix}/edit-optimized.mp4` } });
    expect((await db.submission.findUnique({ where: { id: submission.id } })).activeVideoId).toBe(original.id);
    await finalizeProcessedVideo(db, edited.id, { objectKey: `test/${suffix}/edit-optimized.mp4`, sizeBytes: 700 });
    expect((await db.submission.findUnique({ where: { id: submission.id } })).activeVideoId).toBe(edited.id);
  });
});
