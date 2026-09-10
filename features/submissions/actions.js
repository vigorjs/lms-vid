"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/dal";

export async function submitAttempt(formData) {
  const user = await authorize(["STUDENT"]); const id = String(formData.get("id")); const submission = await db.submission.findUniqueOrThrow({ where: { id }, include: { activeVideo: true } });
  if (submission.studentId !== user.id || submission.status !== "DRAFT" || submission.activeVideo.status !== "READY") return;
  await db.submission.update({ where: { id }, data: { status: "SUBMITTED", submittedAt: new Date() } }); revalidatePath(`/courses/${submission.courseId}`); revalidatePath("/dashboard");
}
