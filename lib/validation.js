import { z } from "zod";
import { MAX_VIDEO_BYTES, MAX_VIDEO_DURATION_SECONDS } from "@/lib/video/constants";
import { MAX_COVER_OUTPUT_BYTES } from "@/lib/image/constants";

export const idSchema = z.string().min(1).max(64);

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(""),
});

export const rubricCriterionSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).optional().default(""),
  weight: z.coerce.number().int().min(1).max(100),
});

export const courseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(3000),
  categoryId: idSchema,
  teacherId: idSchema.optional(),
  passThreshold: z.coerce.number().int().min(1).max(100).default(75),
  criteria: z.array(rubricCriterionSchema).min(1).max(12),
});

export const uploadIntentSchema = z.object({
  courseId: idSchema,
  purpose: z.enum(["REFERENCE", "STUDENT_ORIGINAL", "STUDENT_EDIT"]),
  fileName: z.string().trim().min(1).max(180),
  contentType: z.literal("video/mp4"),
  sizeBytes: z.coerce.number().int().positive().max(MAX_VIDEO_BYTES),
  durationSeconds: z.coerce.number().positive().max(MAX_VIDEO_DURATION_SECONDS),
  parentAssetId: idSchema.optional(),
  submissionId: idSchema.optional(),
  trimStartSeconds: z.coerce.number().min(0).optional(),
  trimEndSeconds: z.coerce.number().positive().optional(),
});

export const coverUploadIntentSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.literal("image/webp"),
  sizeBytes: z.coerce.number().int().positive().max(MAX_COVER_OUTPUT_BYTES),
});

export const coverCompleteSchema = z.object({
  objectKey: z.string().trim().min(1).max(500),
});
