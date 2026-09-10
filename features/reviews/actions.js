"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize, canManageCourse } from "@/lib/auth/dal";
import { calculateWeightedScore, canPassReview } from "./scoring";

const reviewSchema = z.object({
  submissionId: z.string().min(1),
  outcome: z.enum(["PASSED", "REVISION_REQUIRED"]),
  generalFeedback: z.string().trim().min(5).max(3000),
  scores: z.array(z.object({ criterionId: z.string().min(1), score: z.coerce.number().int().min(0).max(100) })),
  comments: z.array(z.object({ timestampSeconds: z.coerce.number().min(0), comment: z.string().trim().min(2).max(500) })).max(30),
});

export async function saveReview(_state, formData) {
  try {
    const actor = await authorize(["ADMIN", "TEACHER"]); let scores = []; let comments = [];
    try { scores = JSON.parse(String(formData.get("scores") || "[]")); comments = JSON.parse(String(formData.get("comments") || "[]")); } catch { throw new Error("Data rubric tidak valid."); }
    const values = reviewSchema.parse({ ...Object.fromEntries(formData), scores, comments });
    const submission = await db.submission.findUniqueOrThrow({ where: { id: values.submissionId }, include: { course: { include: { rubricCriteria: true } }, activeVideo: true } });
    if (!canManageCourse(actor, submission.course) || !["SUBMITTED", "REVIEWED"].includes(submission.status)) throw new Error("Submission tidak dapat direview.");
    if (values.scores.length !== submission.course.rubricCriteria.length) throw new Error("Semua kriteria wajib dinilai.");
    const byId = new Map(values.scores.map((score) => [score.criterionId, score.score]));
    if (submission.course.rubricCriteria.some((criterion) => !byId.has(criterion.id))) throw new Error("Rubric tidak lengkap.");
    const finalScore = calculateWeightedScore(submission.course.rubricCriteria, byId);
    if (values.outcome === "PASSED" && !canPassReview(finalScore, submission.course.passThreshold)) throw new Error(`Nilai minimal lulus adalah ${submission.course.passThreshold}.`);
    if (values.comments.some((item) => item.timestampSeconds > (submission.activeVideo.durationSeconds || 600))) throw new Error("Timestamp feedback melebihi durasi video.");

    await db.$transaction(async (tx) => {
      const review = await tx.review.upsert({
        where: { submissionId: submission.id },
        create: { submissionId: submission.id, reviewerId: actor.id, status: "PUBLISHED", outcome: values.outcome, generalFeedback: values.generalFeedback, finalScore, publishedAt: new Date() },
        update: { reviewerId: actor.id, status: "PUBLISHED", outcome: values.outcome, generalFeedback: values.generalFeedback, finalScore, publishedAt: new Date() },
      });
      await tx.reviewCriterionScore.deleteMany({ where: { reviewId: review.id } });
      await tx.timestampFeedback.deleteMany({ where: { reviewId: review.id } });
      await tx.reviewCriterionScore.createMany({ data: submission.course.rubricCriteria.map((criterion) => ({ reviewId: review.id, criterionId: criterion.id, criterionTitle: criterion.title, weight: criterion.weight, score: byId.get(criterion.id) })) });
      if (values.comments.length) await tx.timestampFeedback.createMany({ data: values.comments.map((comment) => ({ ...comment, reviewId: review.id, authorId: actor.id })) });
      await tx.submission.update({ where: { id: submission.id }, data: { status: "REVIEWED" } });
      await tx.enrollment.upsert({ where: { courseId_studentId: { courseId: submission.courseId, studentId: submission.studentId } }, create: { courseId: submission.courseId, studentId: submission.studentId, completedAt: values.outcome === "PASSED" ? new Date() : null }, update: { completedAt: values.outcome === "PASSED" ? new Date() : null } });
    });
    revalidatePath(`/teacher/reviews/${submission.id}`); revalidatePath(`/courses/${submission.courseId}`); revalidatePath("/dashboard");
    return { ok: true, message: "Review berhasil dipublikasikan." };
  } catch (error) { return { ok: false, message: error.message || "Gagal menyimpan review." }; }
}
