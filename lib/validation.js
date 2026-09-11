import { z } from "zod";
import { MAX_VIDEO_BYTES, MAX_VIDEO_DURATION_SECONDS } from "@/lib/video/constants";
import { EDIT_SPEEDS, MAX_EDIT_SEGMENTS, MIN_EDIT_SEGMENT_SECONDS } from "@/lib/video/edit-spec";
import { MAX_COVER_OUTPUT_BYTES } from "@/lib/image/constants";

export const idSchema = z.string().min(1, "Pilihan wajib diisi.").max(64, "ID tidak valid.");

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(""),
});

export const rubricCriterionSchema = z.object({
  title: z.string().trim().min(2, "Nama kriteria minimal 2 karakter.").max(100, "Nama kriteria maksimal 100 karakter."),
  description: z.string().trim().max(300, "Deskripsi kriteria maksimal 300 karakter.").optional().default(""),
  weight: z.coerce.number().int("Bobot harus berupa angka bulat.").min(1, "Bobot minimal 1%.").max(100, "Bobot maksimal 100%."),
});

export const courseSchema = z.object({
  title: z.string().trim().min(3, "Judul course minimal 3 karakter.").max(120, "Judul course maksimal 120 karakter."),
  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter.").max(3000, "Deskripsi maksimal 3000 karakter."),
  categoryId: idSchema,
  teacherId: idSchema.optional(),
  visibility: z.enum(["PUBLIC", "ASSIGNED"], "Tipe akses course tidak valid.").default("PUBLIC"),
  studentIds: z.array(idSchema).default([]),
  passThreshold: z.coerce.number().int("Nilai kelulusan harus berupa angka bulat.").min(1, "Nilai kelulusan minimal 1.").max(100, "Nilai kelulusan maksimal 100.").default(75),
  criteria: z.array(rubricCriterionSchema).min(1, "Tambahkan minimal satu kriteria.").max(12, "Kriteria maksimal 12 item."),
});

const editSegmentSchema = z.object({
  startSeconds: z.coerce.number().min(0),
  endSeconds: z.coerce.number().positive(),
}).refine((value) => value.endSeconds - value.startSeconds >= MIN_EDIT_SEGMENT_SECONDS, "Segmen terlalu pendek.");

const editCropSchema = z.object({
  x: z.coerce.number().min(0).max(1),
  y: z.coerce.number().min(0).max(1),
  width: z.coerce.number().positive().max(1),
  height: z.coerce.number().positive().max(1),
  aspect: z.coerce.number().positive().max(10),
}).refine((value) => value.x + value.width <= 1.001 && value.y + value.height <= 1.001, "Area crop tidak valid.");

export const videoEditSpecSchema = z.object({
  segments: z.array(editSegmentSchema).min(1).max(MAX_EDIT_SEGMENTS),
  crop: editCropSchema.nullable(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  flipHorizontal: z.boolean(),
  flipVertical: z.boolean(),
  speed: z.number().refine((value) => EDIT_SPEEDS.includes(value), "Kecepatan tidak didukung."),
  volume: z.coerce.number().min(0).max(1),
  muted: z.boolean(),
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
  editSpec: videoEditSpecSchema.optional(),
});

export const coverUploadIntentSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.literal("image/webp"),
  sizeBytes: z.coerce.number().int().positive().max(MAX_COVER_OUTPUT_BYTES),
});

export const coverCompleteSchema = z.object({
  objectKey: z.string().trim().min(1).max(500),
});
